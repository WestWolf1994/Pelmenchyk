(function () {
  "use strict";
  var cfg = window.PELMENCHYK_CONFIG || {};
  var configured = cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseUrl.indexOf("YOUR-PROJECT") < 0 && cfg.supabaseAnonKey.indexOf("YOUR_") < 0;
  var client = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var settingsFields = [
    ["hero_tagline", "Головний підзаголовок"], ["about_story", "Історія бренду"], ["about_quality", "Якість продукції"],
    ["perk1_title", "Перевага 1 — заголовок"], ["perk1_text", "Перевага 1 — опис"], ["perk2_title", "Перевага 2 — заголовок"], ["perk2_text", "Перевага 2 — опис"], ["perk3_title", "Перевага 3 — заголовок"], ["perk3_text", "Перевага 3 — опис"],
    ["phone", "Телефон"], ["instagram_url", "Посилання Instagram"], ["instagram_label", "Текст посилання Instagram"], ["address", "Адреса"], ["hours", "Графік роботи"]
  ];
  function msg(id, text, bad) { var el = $("#" + id); if (el) { el.textContent = text || ""; el.style.color = bad ? "#b42318" : "#27713f"; } }
  function showSession(session) { $("#loginPanel").hidden = !!session; $("#dashboard").hidden = !session; if (session) { $("#sessionLabel").textContent = "Ви увійшли як " + session.user.email; loadAll(); } }
  async function loadAll() { await Promise.all([loadOrders(), loadProducts(), loadSettings()]); }
  async function loadOrders() {
    var res = await client.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (res.error) return msg("ordersMessage", res.error.message, true);
    $("#ordersRows").innerHTML = res.data.map(function (o) { var items = (o.items || []).map(function (x) { return esc(x.name) + " × " + esc(x.qty); }).join("<br>"); return '<tr><td>' + esc(new Date(o.created_at).toLocaleString("uk-UA")) + '<br><b>' + esc(o.order_number) + '</b></td><td>' + esc(o.customer_name) + '<br><a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a><br>' + esc(o.delivery === "delivery" ? o.address : "Самовивіз") + (o.comment ? '<br><span class="small">' + esc(o.comment) + '</span>' : '') + '</td><td>' + items + '</td><td>' + Number(o.total).toLocaleString("uk-UA") + ' ₴</td><td><select class="status-select" data-order-id="' + esc(o.id) + '">' + ["new", "confirmed", "preparing", "completed", "cancelled"].map(function (s) { return '<option value="' + s + '" ' + (o.status === s ? "selected" : "") + '>' + ({ new: "Нове", confirmed: "Підтверджено", preparing: "Готується", completed: "Виконано", cancelled: "Скасовано" }[s]) + '</option>'; }).join("") + '</select></td></tr>'; }).join("") || '<tr><td colspan="5">Замовлень поки немає.</td></tr>';
    msg("ordersMessage", "Завантажено: " + res.data.length + " замовлень.");
  }
  async function loadProducts() {
    var res = await client.from("products").select("*").order("sort_order"); if (res.error) return msg("productsMessage", res.error.message, true);
    $("#productsRows").innerHTML = res.data.map(function (p) { return '<tr data-product="' + esc(p.id) + '"><td><input data-field="name" value="' + esc(p.name) + '"></td><td><textarea data-field="description">' + esc(p.description) + '</textarea></td><td><input data-field="price" type="number" min="0" step="1" value="' + esc(p.price) + '"></td><td><input data-field="weight" value="' + esc(p.weight) + '"></td><td><input data-field="image" value="' + esc(p.image) + '"></td><td><input data-field="available" type="checkbox" ' + (p.available ? "checked" : "") + '></td><td><button data-save-product="' + esc(p.id) + '">Зберегти</button></td></tr>'; }).join("") || '<tr><td colspan="7">Каталог порожній. Натисніть «Завантажити початкове меню».</td></tr>';
  }
  async function loadSettings() {
    var res = await client.from("site_settings").select("key,value"); if (res.error) return msg("settingsMessage", res.error.message, true);
    var values = {}; res.data.forEach(function (x) { values[x.key] = x.value; });
    $("#settingsForm").innerHTML = settingsFields.map(function (x) { var multiline = /story|quality|_text/.test(x[0]); return '<label>' + esc(x[1]) + (multiline ? '<textarea data-setting="' + x[0] + '">' + esc(values[x[0]] || "") + '</textarea>' : '<input data-setting="' + x[0] + '" value="' + esc(values[x[0]] || "") + '">') + '</label>'; }).join("") + '<button class="primary">Зберегти зміни</button>';
  }
  $("#loginForm").addEventListener("submit", async function (e) { e.preventDefault(); if (!client) return msg("loginMessage", "Заповніть supabaseUrl та supabaseAnonKey у assets/js/config.js.", true); var f = e.currentTarget; var r = await client.auth.signInWithPassword({ email: f.elements.email.value, password: f.elements.password.value }); if (r.error) return msg("loginMessage", r.error.message, true); showSession(r.data.session); });
  $("#logoutBtn").addEventListener("click", async function () { await client.auth.signOut(); showSession(null); });
  $("#refreshBtn").addEventListener("click", loadAll);
  document.querySelectorAll(".tabs button").forEach(function (b) { b.addEventListener("click", function () { document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("active", x === b); }); ["orders", "products", "settings"].forEach(function (x) { $("#" + x + "Tab").hidden = x !== b.dataset.tab; }); }); });
  $("#ordersRows").addEventListener("change", async function (e) { if (!e.target.matches("[data-order-id]")) return; var r = await client.from("orders").update({ status: e.target.value }).eq("id", e.target.dataset.orderId); if (r.error) msg("ordersMessage", r.error.message, true); else msg("ordersMessage", "Статус замовлення оновлено."); });
  $("#productsRows").addEventListener("click", async function (e) { var b = e.target.closest("[data-save-product]"); if (!b) return; var tr = b.closest("tr"), value = {}; tr.querySelectorAll("[data-field]").forEach(function (el) { value[el.dataset.field] = el.type === "checkbox" ? el.checked : el.value; }); value.price = Number(value.price); value.id = Number(b.dataset.saveProduct); if (!value.name || !Number.isFinite(value.price) || value.price < 0) return msg("productsMessage", "Перевірте назву та ціну.", true); b.disabled = true; var r = await client.from("products").update(value).eq("id", value.id); b.disabled = false; if (r.error) msg("productsMessage", r.error.message, true); else msg("productsMessage", "Зміни збережені. Оновіть сторінку сайту, щоб побачити їх."); });
  $("#importProducts").addEventListener("click", async function () { var rows = (window.PELMENCHYK_DATA.products || []).map(function (p, i) { return { id: Number(p.id), category: p.category, name: p.name, description: p.description, price: Number(p.price), weight: p.weight || "", image: p.image || "", art: p.art || "", sauce: p.sauce || "", available: p.available !== false, sort_order: i }; }); var r = await client.from("products").upsert(rows, { onConflict: "id" }); if (r.error) msg("productsMessage", r.error.message, true); else { msg("productsMessage", "Початкове меню імпортовано."); loadProducts(); } });
  $("#settingsForm").addEventListener("submit", async function (e) { e.preventDefault(); var rows = Array.prototype.map.call(e.currentTarget.querySelectorAll("[data-setting]"), function (el) { return { key: el.dataset.setting, value: el.value }; }); var r = await client.from("site_settings").upsert(rows, { onConflict: "key" }); if (r.error) msg("settingsMessage", r.error.message, true); else msg("settingsMessage", "Налаштування збережені."); });
  if (!client) msg("loginMessage", "Потрібно налаштувати Supabase у assets/js/config.js.", true);
  else client.auth.getSession().then(function (r) { showSession(r.data.session); });
})();
