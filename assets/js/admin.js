/*
 * Адмінка Пельменчука: замовлення, меню, налаштування сайту.
 * Працює через Supabase (assets/js/api.js). Права перевіряє сервер (RLS), а не цей файл.
 */
(function () {
  "use strict";
  var API = window.PM_API;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return Number(n).toLocaleString("uk-UA") + " ₴"; }

  var STATUS = { "new": "Нове", confirmed: "Підтверджено", cooking: "Готується", done: "Виконано", cancelled: "Скасовано" };
  var PAY = { unpaid: "Не оплачено", pending: "Очікує оплати", paid: "Оплачено", failed: "Оплата не пройшла" };
  var PAYM = { cash: "Готівка / при отриманні", online: "Онлайн" };

  var state = { tab: "orders", orders: [], cats: [], products: [], seen: {}, timer: null };

  function notice(msg, bad) {
    var n = $("#notice");
    n.textContent = msg; n.hidden = !msg; n.className = "notice" + (bad ? " bad" : "");
    if (msg) { clearTimeout(notice.t); notice.t = setTimeout(function () { n.hidden = true; }, 6000); }
  }
  function fail(e) { notice((e && e.message) ? "Помилка: " + e.message : "Помилка", true); }

  function show(view) {
    ["loginView", "setupView", "ordersView", "menuView", "settingsView"].forEach(function (id) { $("#" + id).hidden = (id !== view); });
  }

  /* ---------- Вхід ---------- */
  function boot() {
    if (!API || !API.enabled()) { show("setupView"); return; }
    if (!API.isLoggedIn()) { showLogin(); return; }
    API.isAdmin().then(function (ok) {
      if (!ok) { API.logout(); showLogin("Цей акаунт не має прав адміністратора."); return; }
      enter();
    }, function () { showLogin(); });
  }
  function showLogin(msg) {
    $("#tabs").hidden = true; $("#userBox").hidden = true;
    show("loginView");
    $("#loginErr").textContent = msg || "";
    clearInterval(state.timer);
  }
  function enter() {
    $("#tabs").hidden = false; $("#userBox").hidden = false;
    var s = API.session(); $("#userEmail").textContent = s ? s.email : "";
    switchTab(state.tab);
    clearInterval(state.timer);
    state.timer = setInterval(function () { if (state.tab === "orders" && !document.hidden) loadOrders(true); }, 20000);
  }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("#lEmail").value.trim(), pass = $("#lPass").value;
    if (!email || !pass) { $("#loginErr").textContent = "Введіть e-mail і пароль."; return; }
    var btn = e.target.querySelector("button"); btn.disabled = true;
    API.login(email, pass).then(function () { return API.isAdmin(); }).then(function (ok) {
      btn.disabled = false;
      if (!ok) { API.logout(); $("#loginErr").textContent = "Цей акаунт не має прав адміністратора."; return; }
      $("#lPass").value = "";
      enter();
    }).catch(function () { btn.disabled = false; $("#loginErr").textContent = "Невірний e-mail або пароль."; });
  });
  $("#logout").addEventListener("click", function () { API.logout(); showLogin(); });

  $("#tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (b) switchTab(b.getAttribute("data-tab"));
  });
  function switchTab(t) {
    state.tab = t;
    $$("#tabs [data-tab]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tab") === t)); });
    show(t + "View");
    if (t === "orders") loadOrders(false);
    if (t === "menu") loadMenu();
    if (t === "settings") loadSettings();
  }

  /* ---------- Замовлення ---------- */
  function loadOrders(quiet) {
    API.orders(300).then(function (rows) {
      var first = !Object.keys(state.seen).length;
      var fresh = 0;
      rows.forEach(function (o) { if (!state.seen[o.id]) { if (!first && o.status === "new") fresh++; state.seen[o.id] = true; } });
      state.orders = rows;
      renderOrders();
      if (quiet && fresh) notice("Нових замовлень: " + fresh);
    }).catch(function (e) { if (e.status === 401) showLogin("Сеанс завершився. Увійдіть знову."); else if (!quiet) fail(e); });
  }
  $("#refreshOrders").addEventListener("click", function () { loadOrders(false); });
  $("#orderFilter").addEventListener("change", renderOrders);

  function renderOrders() {
    var f = $("#orderFilter").value;
    var list = state.orders.filter(function (o) { return !f || o.status === f; });
    var news = state.orders.filter(function (o) { return o.status === "new"; }).length;
    var badge = $("#newBadge"); badge.textContent = news; badge.hidden = !news;
    $("#ordersInfo").textContent = "Показано " + list.length + " із " + state.orders.length;
    if (!list.length) { $("#ordersList").innerHTML = '<p class="muted">Замовлень поки немає.</p>'; return; }
    $("#ordersList").innerHTML = list.map(function (o) {
      var d = new Date(o.created_at);
      var items = (o.items || []).map(function (i) { return "<li>" + esc(i.name) + " × " + esc(i.qty) + " — " + money(i.sum) + "</li>"; }).join("");
      return '<article class="card' + (o.status === "new" ? " is-new" : "") + '" data-oid="' + o.id + '">' +
        '<div class="o-top"><strong>' + esc(o.number) + '</strong><span class="muted">' + d.toLocaleString("uk-UA") + '</span></div>' +
        '<div class="o-grid">' +
        '<div><b>' + esc(o.name) + '</b><br><a href="tel:' + esc(o.phone.replace(/[^\d+]/g, "")) + '">' + esc(o.phone) + '</a></div>' +
        '<div>' + (o.delivery === "delivery" ? "Доставка: " + esc(o.address) : "Самовивіз") + '</div>' +
        '<div>Оплата: ' + esc(PAYM[o.payment_method] || o.payment_method) + ' <span class="pill ' + esc(o.payment_status) + '">' + esc(PAY[o.payment_status] || o.payment_status) + '</span></div>' +
        '</div>' +
        '<ul class="o-items">' + items + '</ul>' +
        (o.comment ? '<div><b>Коментар:</b> ' + esc(o.comment) + '</div>' : "") +
        '<div class="o-actions"><strong>Разом: ' + money(o.total) + '</strong>' +
        '<label>Статус<select data-ostatus>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === o.status ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + '</select></label>' +
        (o.payment_method === "cash" && o.payment_status !== "paid" ? '<button type="button" class="a-btn a-ghost" data-markpaid>Позначити оплаченим</button>' : "") +
        '<button type="button" class="a-btn a-danger" data-odel>Видалити</button></div></article>';
    }).join("");
  }

  $("#ordersList").addEventListener("change", function (e) {
    var sel = e.target.closest("[data-ostatus]"); if (!sel) return;
    var id = sel.closest("[data-oid]").getAttribute("data-oid");
    API.updateOrder(id, { status: sel.value }).then(function () {
      state.orders.forEach(function (o) { if (String(o.id) === id) o.status = sel.value; });
      renderOrders(); notice("Статус оновлено");
    }).catch(fail);
  });
  $("#ordersList").addEventListener("click", function (e) {
    var card = e.target.closest("[data-oid]"); if (!card) return;
    var id = card.getAttribute("data-oid");
    if (e.target.closest("[data-markpaid]")) {
      API.updateOrder(id, { payment_status: "paid" }).then(function () { loadOrders(false); notice("Позначено оплаченим"); }).catch(fail);
    } else if (e.target.closest("[data-odel]")) {
      if (!confirm("Видалити це замовлення назавжди?")) return;
      API.deleteOrder(id).then(function () { loadOrders(false); notice("Замовлення видалено"); }).catch(fail);
    }
  });

  /* ---------- Меню ---------- */
  function loadMenu() {
    Promise.all([API.getPublic(), API.allProducts()]).then(function (r) {
      state.cats = r[0].categories; state.products = r[1];
      renderCats(); renderProducts();
    }).catch(fail);
  }

  function renderCats() {
    $("#catList").innerHTML = state.cats.map(function (c) {
      return '<div class="cat-row" data-cid="' + esc(c.id) + '"><input type="text" maxlength="40" value="' + esc(c.name) + '" aria-label="Назва категорії">' +
        '<button type="button" class="a-btn a-ghost" data-csave>Зберегти</button><button type="button" class="a-btn a-danger" data-cdel>Видалити</button></div>';
    }).join("") || '<p class="muted">Категорій ще немає.</p>';
  }
  function slug(s) {
    var map = { а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ie",ж:"zh",з:"z",и:"y",і:"i",ї:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"iu",я:"ia","'":"","’":"" };
    var r = s.toLowerCase().split("").map(function (ch) { return map[ch] != null ? map[ch] : ch; }).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return r || "cat-" + Date.now().toString(36);
  }
  $("#catAdd").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#catName").value.trim(); if (!name) return;
    var id = slug(name);
    if (state.cats.some(function (c) { return c.id === id; })) id += "-" + Date.now().toString(36).slice(-3);
    API.createCategory({ id: id, name: name, sort: state.cats.length }).then(function () { $("#catName").value = ""; loadMenu(); notice("Категорію додано"); }).catch(fail);
  });
  $("#catList").addEventListener("click", function (e) {
    var row = e.target.closest("[data-cid]"); if (!row) return;
    var id = row.getAttribute("data-cid");
    if (e.target.closest("[data-csave]")) {
      var name = $("input", row).value.trim(); if (!name) return;
      API.updateCategory(id, { name: name }).then(function () { loadMenu(); notice("Збережено"); }).catch(fail);
    } else if (e.target.closest("[data-cdel]")) {
      if (!confirm("Видалити категорію? Страви в ній залишаться без категорії.")) return;
      API.deleteCategory(id).then(function () { loadMenu(); notice("Категорію видалено"); }).catch(fail);
    }
  });

  function catOptions(sel) {
    return '<option value="">— без категорії —</option>' + state.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("");
  }
  function productCard(p) {
    var isNew = !p.id;
    return '<article class="card" data-pid="' + (p.id || "") + '"><div class="p-grid">' +
      '<div class="p-img">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" data-preview>' : '<div class="noimg" data-preview>Без фото</div>') +
      '<label class="a-btn a-ghost" style="cursor:pointer">Завантажити фото<input type="file" accept="image/*" data-file hidden></label></div>' +
      '<div class="p-fields">' +
      '<label class="wide">Назва<input type="text" data-f="name" maxlength="120" value="' + esc(p.name) + '"></label>' +
      '<label class="wide">Опис<textarea data-f="description" rows="2" maxlength="400">' + esc(p.description) + '</textarea></label>' +
      '<label>Ціна, ₴<input type="number" data-f="price" min="0" step="1" value="' + esc(p.price) + '"></label>' +
      '<label>Вага / порція<input type="text" data-f="weight" maxlength="40" value="' + esc(p.weight) + '"></label>' +
      '<label>Категорія<select data-f="category">' + catOptions(p.category) + '</select></label>' +
      '<label class="wide">Посилання на фото (можна вставити адресу або завантажити файл)<input type="url" data-f="image" value="' + esc(p.image) + '" placeholder="https://..."></label>' +
      '<label class="chk"><input type="checkbox" data-f="available"' + (p.available ? " checked" : "") + '> В наявності</label>' +
      '</div></div>' +
      '<p class="a-err" data-err></p>' +
      '<div class="p-actions"><button type="button" class="a-btn" data-psave>' + (isNew ? "Створити" : "Зберегти") + '</button>' +
      (isNew ? '<button type="button" class="a-btn a-ghost" data-pcancel>Скасувати</button>' : '<button type="button" class="a-btn a-danger" data-pdel>Видалити</button>') + '</div></article>';
  }
  function renderProducts() {
    $("#productList").innerHTML = state.products.map(productCard).join("") || '<p class="muted">Страв ще немає.</p>';
  }
  $("#addProduct").addEventListener("click", function () {
    if ($('#productList [data-pid=""]')) return;
    var tmp = document.createElement("div");
    tmp.innerHTML = productCard({ name: "", description: "", price: "", weight: "", category: state.cats[0] ? state.cats[0].id : "", image: "", available: true });
    $("#productList").insertBefore(tmp.firstChild, $("#productList").firstChild);
    $('#productList [data-pid=""] [data-f="name"]').focus();
  });

  function readCard(card) {
    var v = {};
    $$("[data-f]", card).forEach(function (el) {
      var k = el.getAttribute("data-f");
      v[k] = el.type === "checkbox" ? el.checked : el.value.trim();
    });
    return v;
  }
  function validateProduct(v) {
    if (v.name.length < 2) return "Вкажіть назву.";
    var price = Number(v.price);
    if (v.price === "" || isNaN(price) || price < 0) return "Вкажіть коректну ціну.";
    if (v.image && !/^(https?:\/\/|assets\/)/i.test(v.image)) return "Посилання на фото має починатися з https://";
    return "";
  }

  $("#productList").addEventListener("click", function (e) {
    var card = e.target.closest("[data-pid]"); if (!card) return;
    var id = card.getAttribute("data-pid");
    var err = $("[data-err]", card);
    if (e.target.closest("[data-pcancel]")) { card.remove(); return; }
    if (e.target.closest("[data-pdel]")) {
      if (!confirm("Видалити страву назавжди? Замість цього можна зняти галочку «В наявності».")) return;
      API.deleteProduct(id).then(function () { loadMenu(); notice("Страву видалено"); }).catch(fail);
      return;
    }
    if (e.target.closest("[data-psave]")) {
      var v = readCard(card);
      var m = validateProduct(v); err.textContent = m; if (m) return;
      var body = { name: v.name, description: v.description, price: Number(v.price), weight: v.weight, category: v.category || null, image: v.image, available: v.available };
      var req;
      if (id) req = API.updateProduct(id, body);
      else { body.sort = state.products.length; req = API.createProduct(body); }
      req.then(function () { loadMenu(); notice("Збережено. На сайті зміни з'являться після оновлення сторінки."); }).catch(function (x) { err.textContent = x.message || "Не вдалося зберегти"; });
    }
  });

  // Завантаження фото: зменшуємо до 1200 px і стискаємо
  $("#productList").addEventListener("change", function (e) {
    var inp = e.target.closest("[data-file]"); if (!inp || !inp.files[0]) return;
    var card = inp.closest("[data-pid]"), err = $("[data-err]", card);
    err.textContent = "Завантажуємо фото…";
    shrink(inp.files[0]).then(function (b) {
      var name = "p" + Date.now().toString(36) + (Math.random().toString(36).slice(2, 6)) + (b.type === "image/webp" ? ".webp" : ".jpg");
      return API.upload(b, name, b.type);
    }).then(function (url) {
      $('[data-f="image"]', card).value = url;
      var pv = $("[data-preview]", card);
      var img = document.createElement("img"); img.src = url; img.alt = ""; img.setAttribute("data-preview", "");
      pv.replaceWith(img);
      err.textContent = "Фото завантажено. Натисніть «Зберегти».";
    }).catch(function (x) { err.textContent = "Не вдалося завантажити фото: " + (x.message || ""); });
    inp.value = "";
  });

  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1200, r = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) {
          if (b && b.type === "image/webp") return res(b);
          c.toBlob(function (j) { j ? res(j) : rej(new Error("не вдалося обробити фото")); }, "image/jpeg", 0.85);
        }, "image/webp", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error("це не зображення")); };
      img.src = u;
    });
  }

  /* ---------- Налаштування сайту ---------- */
  function loadSettings() {
    API.getPublic().then(function (r) {
      var S = {}; r.settings.forEach(function (x) { S[x.key] = x.value; });
      $$("#settingsForm [name]").forEach(function (el) { el.value = S[el.name] || ""; });
    }).catch(fail);
  }
  $("#settingsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#settingsErr"); err.textContent = "";
    var rows = [];
    var bad = "";
    $$("#settingsForm [name]").forEach(function (el) {
      var v = el.value.trim();
      if (el.type === "url" && v && !/^https?:\/\//i.test(v)) bad = "Посилання мають починатися з https://";
      rows.push({ key: el.name, value: v });
    });
    if (bad) { err.textContent = bad; return; }
    API.saveSettings(rows).then(function () { notice("Збережено. На сайті зміни з'являться після оновлення сторінки."); }).catch(function (x) { err.textContent = x.message || "Не вдалося зберегти"; });
  });

  boot();
})();
