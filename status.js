(function () {
  const body = document.querySelector("#orders-body");
  const message = document.querySelector("#status-message");
  const count = document.querySelector("#order-count");
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function render(orders, source) {
    count.textContent = `${orders.length} 筆`;
    body.innerHTML = orders.map((order) => {
      const detail = (order.items || []).map((item) => `${escapeHTML(item.name)}${item.tea ? `（${escapeHTML(item.tea)}）` : ""} ×${Number(item.quantity) || 1}`).join("、");
      const date = new Date(order.createdAt || order.timestamp || "");
      const time = Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-TW", {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
      return `<tr><td data-label="姓名"><span class="student-name">${escapeHTML(order.name)}</span></td><td data-label="飲料內容">${detail}</td><td data-label="金額"><strong class="order-total">NT$ ${Number(order.total) || 0}</strong></td><td data-label="送出時間" class="order-time">${escapeHTML(time)}</td></tr>`;
    }).join("");
    if (orders.length) message.textContent = source === "local" ? "這些是此裝置的示範訂單；連接 Google Sheet 後，所有同學會看到共用紀錄。" : "已載入最新訂單。";
    else message.textContent = source === "local" ? "目前沒有示範訂單。" : "目前還沒有訂單，來送出第一筆吧！";
  }

  function loadOrders() {
    message.textContent = "正在載入訂單…";
    if (!window.ORDER_API_URL) {
      try { render(JSON.parse(localStorage.getItem("tea-orders") || "[]"), "local"); }
      catch { render([], "local"); }
      return;
    }
    const callback = `__ordersCallback_${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => { cleanup(); message.textContent = "載入失敗，請確認 Apps Script 部署網址與網路連線。"; }, 12000);
    function cleanup() { clearTimeout(timeout); delete window[callback]; script.remove(); }
    window[callback] = (orders) => {
      cleanup();
      if (orders && !Array.isArray(orders) && orders.error) { message.textContent = `載入失敗：${orders.error}`; return; }
      render(Array.isArray(orders) ? orders : [], "sheet");
    };
    script.onerror = () => { cleanup(); message.textContent = "載入失敗，請確認 Apps Script 部署網址與存取權限。"; };
    script.src = `${window.ORDER_API_URL}${window.ORDER_API_URL.includes("?") ? "&" : "?"}callback=${encodeURIComponent(callback)}&t=${Date.now()}`;
    document.head.append(script);
  }

  document.querySelector("#refresh-orders").addEventListener("click", loadOrders);
  loadOrders();
}());
