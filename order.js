(function () {
  const form = document.querySelector("#order-form");
  const groupsRoot = document.querySelector("#drink-groups");
  const filtersRoot = document.querySelector("#category-filters");
  const selected = new Map();
  let activeCategory = "全部";
  let searchText = "";

  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const allItems = () => window.MENU_CATEGORIES.flatMap((category, categoryIndex) => category.items.map((item, itemIndex) => ({...item, category:category.name, categoryIndex, itemIndex})));
  const categories = window.MENU_CATEGORIES;

  function renderFilters() {
    filtersRoot.innerHTML = ["全部", ...categories.map((category) => category.name)].map((name) =>
      `<button class="filter-chip${activeCategory === name ? " active" : ""}" type="button" data-category="${esc(name)}" aria-pressed="${activeCategory === name}">${esc(name)}</button>`
    ).join("");
    filtersRoot.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderFilters();
      filterGroups();
    }));
  }

  function renderMenu() {
    groupsRoot.innerHTML = categories.map((category, categoryIndex) => {
      const cards = category.items.map((item, itemIndex) => {
        const key = `${categoryIndex}-${itemIndex}`;
        const priceText = item.prices ? `NT$ ${item.prices[0]} / ${item.prices[1]}` : `NT$ ${item.price}`;
        const tags = [item.decaf ? "無咖啡因" : "", item.note || ""].filter(Boolean);
        const teaControl = item.teas ? `<label class="option-control">茶底<select data-option="tea">${item.teas.map((tea) => `<option>${esc(tea)}</option>`).join("")}</select></label>` : "";
        const sizeControl = item.prices ? `<label class="option-control">容量<select data-option="size"><option value="0">中杯 NT$ ${item.prices[0]}</option><option value="1">大杯 NT$ ${item.prices[1]}</option></select></label>` : `<span class="fixed-price">${priceText}</span>`;
        const sugarControl = item.fixedSugar ? `<span class="fixed-option">${esc(item.fixedSugar)}</span>` : `<label class="option-control">甜度<select data-option="sugar"><option>全糖</option><option>少糖</option><option>半糖</option><option>微糖</option><option>兩分糖</option><option>一分糖</option><option>無糖</option></select></label>`;
        const iceControl = item.note && item.note.includes("固定冰量") ? `<span class="fixed-option">固定冰量</span>` : `<label class="option-control">冰量<select data-option="ice"><option>正常冰</option><option>少冰</option><option>微冰</option><option>去冰</option></select></label>`;
        const hotControl = item.hot ? `<label class="option-control hot-option"><input type="checkbox" data-option="hot"> 做熱</label>` : "";
        const addOnControl = `<label class="option-control addon-option">加料<select data-option="addon"><option value="">不加料</option><option value="珍珠|10">珍珠 +10</option><option value="椰果|10">椰果 +10</option><option value="橘Q凍|20">橘Q凍 +20</option><option value="水晶Q凍|20">水晶Q凍 +20</option><option value="奶蓋|25">奶蓋 +25</option></select></label>`;
        return `<article class="drink-card" data-key="${key}" data-category="${esc(category.name)}" data-name="${esc(item.name.toLowerCase())}">
          <label class="drink-select"><input type="checkbox" data-option="selected"><span class="checkmark" aria-hidden="true"></span><span class="drink-name">${esc(item.name)}</span><span class="drink-price">${priceText}</span></label>
          ${tags.length ? `<div class="drink-tags">${tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>` : ""}
          <div class="drink-options" hidden>
            <div class="option-grid">${sizeControl}${teaControl}<label class="option-control quantity-control">數量<div class="quantity-stepper"><button type="button" data-qty="-1" aria-label="減少數量">−</button><input data-option="quantity" type="number" min="1" max="20" value="1" inputmode="numeric"><button type="button" data-qty="1" aria-label="增加數量">＋</button></div></label>${sugarControl}${iceControl}${hotControl}${addOnControl}</div>
          </div>
        </article>`;
      }).join("");
      return `<section class="drink-group" data-category="${esc(category.name)}"><button class="group-heading" type="button" aria-expanded="true"><span>${esc(category.name)}</span><span class="group-count">${category.items.length} 款 <span aria-hidden="true">⌄</span></span></button><div class="drink-list">${cards}</div></section>`;
    }).join("");

    groupsRoot.querySelectorAll(".drink-card").forEach((card) => {
      const selectedInput = card.querySelector('[data-option="selected"]');
      const options = card.querySelector(".drink-options");
      selectedInput.addEventListener("change", () => {
        options.hidden = !selectedInput.checked;
        if (selectedInput.checked) selected.set(card.dataset.key, card);
        else selected.delete(card.dataset.key);
        updateSummary();
      });
      card.querySelectorAll("select,input[type=number],input[type=checkbox]").forEach((input) => {
        input.addEventListener("change", updateSummary);
        input.addEventListener("input", updateSummary);
      });
      card.querySelectorAll("[data-qty]").forEach((button) => button.addEventListener("click", () => {
        const quantity = card.querySelector('[data-option="quantity"]');
        quantity.value = String(Math.max(1, Math.min(20, Number(quantity.value || 1) + Number(button.dataset.qty))));
        updateSummary();
      }));
    });
    groupsRoot.querySelectorAll(".group-heading").forEach((button) => button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.nextElementSibling.hidden = expanded;
    }));
    filterGroups();
  }

  function filterGroups() {
    const normalized = searchText.trim().toLowerCase();
    let count = 0;
    groupsRoot.querySelectorAll(".drink-group").forEach((group) => {
      const categoryMatch = activeCategory === "全部" || activeCategory === group.dataset.category;
      let groupCount = 0;
      group.querySelectorAll(".drink-card").forEach((card) => {
        const visible = categoryMatch && (!normalized || card.dataset.name.includes(normalized));
        card.hidden = !visible;
        if (visible) groupCount++;
      });
      group.hidden = groupCount === 0;
      count += groupCount;
    });
    document.querySelector("#menu-count").textContent = `顯示 ${count} 款飲料，共 ${allItems().length} 款`;
  }

  function readCard(card) {
    const [categoryIndex, itemIndex] = card.dataset.key.split("-").map(Number);
    const item = categories[categoryIndex].items[itemIndex];
    const sizeSelect = card.querySelector('[data-option="size"]');
    const basePrice = item.prices ? item.prices[Number(sizeSelect.value)] : item.price;
    const quantity = Math.max(1, Math.min(20, Number(card.querySelector('[data-option="quantity"]').value) || 1));
    const addon = card.querySelector('[data-option="addon"]').value;
    const [addonName, addonPrice] = addon ? addon.split("|") : ["", "0"];
    const tea = card.querySelector('[data-option="tea"]')?.value || "";
    const hot = Boolean(card.querySelector('[data-option="hot"]')?.checked);
    const sugar = card.querySelector('[data-option="sugar"]')?.value || item.fixedSugar || "固定甜度";
    const ice = hot ? "熱飲" : (card.querySelector('[data-option="ice"]')?.value || (item.note?.includes("固定冰量") ? "固定冰量" : "正常冰"));
    const unitPrice = basePrice + Number(addonPrice);
    const detail = [tea, sugar, ice, addonName && `加${addonName}`].filter(Boolean).join("／");
    return {name:item.name, category:categories[categoryIndex].name, tea, size:item.prices ? (Number(sizeSelect.value) ? "大杯" : "中杯") : "", sugar, ice, addon:addonName, quantity, unitPrice, subtotal:unitPrice*quantity, detail};
  }

  function updateSummary() {
    const summaryRoot = document.querySelector("#summary-items");
    const entries = [...selected.values()].map(readCard);
    const total = entries.reduce((sum, entry) => sum + entry.subtotal, 0);
    document.querySelector("#total-price").textContent = `NT$ ${total}`;
    summaryRoot.innerHTML = entries.length ? entries.map((entry) => `<div class="summary-item"><div><strong>${esc(entry.name)}${entry.tea ? `・${esc(entry.tea)}` : ""}</strong><small>${esc([entry.size, entry.detail].filter(Boolean).join("／"))}</small></div><span>×${entry.quantity}</span><b>$${entry.subtotal}</b></div>`).join("") : '<p class="empty-summary">選好飲料後，金額會顯示在這裡。</p>';
    return {entries, total};
  }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem("tea-orders") || "[]"); }
    catch { return []; }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#submit-status");
    const error = document.querySelector("#form-error");
    error.textContent = "";
    const {entries, total} = updateSummary();
    if (!entries.length) { error.textContent = "請至少選擇一杯飲料。"; return; }
    const button = document.querySelector("#submit-order");
    const order = {id:window.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt:new Date().toISOString(), name:form.elements.name.value.trim(), items:entries, total};
    if (!order.name) { form.elements.name.focus(); return; }
    button.disabled = true;
    status.className = "submit-status";
    status.textContent = "正在送出訂單…";
    try {
      if (window.ORDER_API_URL) {
        await fetch(window.ORDER_API_URL, {method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(order)});
        status.textContent = "訂單已送出。請到「查看訂單」確認記錄。";
      } else {
        const orders = getOrders();
        orders.unshift(order);
        localStorage.setItem("tea-orders", JSON.stringify(orders));
        status.textContent = "示範模式：訂單已存在此裝置。連接 Google Sheet 後即可共用。";
      }
      status.classList.add("success");
      form.reset();
      selected.clear();
      groupsRoot.querySelectorAll('.drink-card').forEach((card) => { card.querySelector('[data-option="selected"]').checked = false; card.querySelector(".drink-options").hidden = true; });
      updateSummary();
    } catch (err) {
      status.textContent = "送出失敗，請確認網路後再試一次。";
      status.classList.add("failure");
    } finally { button.disabled = false; }
  });

  document.querySelector("#menu-search").addEventListener("input", (event) => { searchText = event.target.value; filterGroups(); });
  renderFilters();
  renderMenu();
  updateSummary();
}());
