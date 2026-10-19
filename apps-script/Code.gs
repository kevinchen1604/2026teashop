const SHEET_NAME = "訂單";
const SPREADSHEET_TITLE = "2026手搖飲點餐記錄";
const HEADERS = ["訂單編號", "送出時間", "姓名", "飲料明細", "總金額"];

function setup() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty("SPREADSHEET_ID");
  let spreadsheet;
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_TITLE);
    props.setProperty("SPREADSHEET_ID", spreadsheet.getId());
  }
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const existingSheets = spreadsheet.getSheets();
    if (existingSheets.length === 1 && existingSheets[0].getLastRow() === 0) {
      sheet = existingSheets[0];
      sheet.setName(SHEET_NAME);
    } else {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
  }
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#dcecf5");
  return spreadsheet.getUrl();
}

function doPost(e) {
  try {
    const order = JSON.parse(e && e.postData && e.postData.contents || "{}");
    if (!order.id || !String(order.name || "").trim() || !Array.isArray(order.items) || !order.items.length) {
      throw new Error("缺少訂單編號、姓名或飲料項目。");
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const props = PropertiesService.getScriptProperties();
      const spreadsheet = SpreadsheetApp.openById(props.getProperty("SPREADSHEET_ID"));
      const sheet = spreadsheet.getSheetByName(SHEET_NAME);
      const found = sheet.createTextFinder(String(order.id)).matchEntireCell(true).findNext();
      if (found) return jsonOutput({ok:true, duplicate:true});
      const items = order.items.map(function (item) {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        return {name:String(item.name || ""), tea:String(item.tea || ""), size:String(item.size || ""), sugar:String(item.sugar || ""), ice:String(item.ice || ""), addon:String(item.addon || ""), quantity:quantity, unitPrice:Math.max(0, Number(item.unitPrice) || 0), subtotal:Math.max(0, Number(item.unitPrice) || 0) * quantity};
      });
      const total = items.reduce(function (sum, item) { return sum + item.subtotal; }, 0);
      if (Number(order.total) !== total) throw new Error("訂單總價與飲料明細不符。");
      const details = items.map(function (item) {
        return [item.name, item.tea, item.size, item.sugar, item.ice, item.addon && "加" + item.addon, "x" + item.quantity, "NT$" + item.subtotal].filter(Boolean).join("／");
      }).join("；");
      sheet.appendRow([String(order.id), new Date(), String(order.name).trim(), details, total]);
      return jsonOutput({ok:true, total:total});
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonOutput({ok:false, error:String(error.message || error)});
  }
}

function doGet(e) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("請先執行 setup() 建立點餐試算表。");
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SHEET_NAME);
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues() : [];
    const orders = rows.reverse().map(function (row) {
      let createdAt = row[1] instanceof Date ? row[1].toISOString() : String(row[1] || "");
      return {id:String(row[0]), createdAt:createdAt, name:String(row[2]), items:parseDetails(String(row[3])), total:Number(row[4]) || 0};
    });
    const callback = e && e.parameter && e.parameter.callback;
    const payload = JSON.stringify(orders);
    if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
      return ContentService.createTextOutput(callback + "(" + payload + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const payload = JSON.stringify({error:String(error.message || error)});
    const callback = e && e.parameter && e.parameter.callback;
    if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) return ContentService.createTextOutput(callback + "(" + payload + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }
}

function parseDetails(details) {
  return details.split("；").filter(Boolean).map(function (part) {
    const pieces = part.split("／");
    const quantityMatch = part.match(/x(\d+)/);
    const priceMatch = part.match(/NT\$(\d+)/);
    return {name:pieces[0] || "飲料", tea:pieces[1] || "", size:pieces[2] || "", sugar:pieces[3] || "", ice:pieces[4] || "", addon:pieces[5] || "", quantity:quantityMatch ? Number(quantityMatch[1]) : 1, subtotal:priceMatch ? Number(priceMatch[1]) : 0};
  });
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
