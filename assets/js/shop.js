(function () {
  "use strict";
  var cfg = window.PELMENCHYK_CONFIG || {};
  var fallback = window.PELMENCHYK_DATA || { categories: [], products: [], showcase: [] };
  var client = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && cfg.supabaseUrl.indexOf("YOUR-PROJECT") < 0 && cfg.supabaseAnonKey.indexOf("YOUR_") < 0
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  var products = fallback.products.slice();
  var categories = fallback.categories.slice();
  var settings = {};
  var cart = [];
  var activeCategory = "all";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (n) { return Number(n || 0).toLocaleString("uk-UA") + " ₴"; };
  var storeKey = "pelmenchyk.cart.v2";
  function product(id) { return products.filter(function (p) { return Number(p.id) === Number(id); })[0]; }
  function applySettings() {
    var text = { hero_tagline: "heroTagline", about_story: "aboutStory", about_quality: "aboutQuality", perk1_title: "perk1Title", perk1_text: "perk1Text", perk2_title: "perk2Title", perk2_text: "perk2Text", perk3_title: "perk3Title", perk3_text: "perk3Text", address: "contactAddress", hours: "contactHours" };
    Object.keys(text).forEach(function (key) { if (settings[key] != null) $("#" + text[key]).textContent = settings[key]; });
    if (settings.phone) { $("#contactPhone").textContent = settings.phone; $("#contactPhone").href = "tel:" + settings.phone.replace(/[^+\d]/g, ""); $("#footerContact").textContent = settings.phone; }
    if (settings.instagram_url) { $("#contactInstagram").href = settings.instagram_url; $("#contactInstagram").textContent = settings.instagram_label || settings.instagram_url; }
  }
  function media(item) { return item.image ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy">' : (window.PELMENCHYK_ART ? window.PELMENCHYK_ART.svg(item.art, item.sauce) : ""); }
  function draw() {
    var catGrid = $("#catGrid");
    catGrid.innerHTML = categories.map(function (c) { var count = products.filter(function (p) { return p.category === c.id; }).length; return '<button class="cat-card" data-category="' + esc(c.id) + '"><div class="cat-media" style="background:' + esc(c.bg || "#E4CBA8") + '">' + media(c) + '</div><div class="cat-body"><strong>' + esc(c.name) + '</strong><span>' + count + ' позицій</span></div></button>'; }).join("");
    $("#filters").innerHTML = [{ id: "all", name: "Всі" }].concat(categories).map(function (c) { return '<button class="pill" data-category="' + esc(c.id) + '" aria-pressed="' + (activeCategory === c.id) + '">' + esc(c.name) + '</button>'; }).join("");
    var shown = products.filter(function (p) { return activeCategory === "all" || p.category === activeCategory; });
    $("#productGrid").innerHTML = shown.length ? shown.map(function (p) { return '<article class="card"><div class="card-media">' + media(p) + '</div><div class="card-body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.description) + '</p><div class="card-meta"><span class="price">' + money(p.price) + '</span><span class="weight">' + esc(p.weight || "") + '</span></div><button class="btn btn-primary" data-add="' + Number(p.id) + '" ' + (p.available === false ? "disabled" : "") + '>' + (p.available === false ? "Немає в наявності" : "До кошика") + '</button></div></article>'; }).join("") : '<p class="empty">У цій категорії поки немає страв.</p>';
    var featured = (fallback.showcase || []).filter(function (x) { return product(x.product); }).slice(0, 5);
    $("#showcase").hidden = !featured.length;
    $("#stage").innerHTML = featured.map(function (x, i) { var p = product(x.product); return '<div class="plate ' + (i ? "is-wait" : "is-active") + '"><img src="' + esc(p.image || "") + '" alt="' + esc(p.name) + '"></div>'; }).join("");
    $("#txStack").innerHTML = featured.map(function (x, i) { var p = product(x.product); return '<div class="tx ' + (i ? "t-off" : "t-active") + '"><div class="tx-top"><div><div class="tx-label">Улюблене</div><div class="tx-l1">' + esc(x.line1) + '</div><div class="tx-l2">' + esc(x.line2) + '</div></div><div class="tx-badge"><b>' + money(p.price) + '</b><small>' + esc(p.weight || "") + '</small></div></div><button class="btn btn-primary btn-block" data-add="' + Number(p.id) + '">До кошика</button></div>'; }).join("");
    $("#thumbs").innerHTML = featured.map(function (x, i) { return '<button class="thumb" data-slide="' + i + '" aria-pressed="' + (!i) + '"><span>' + esc(x.short) + '</span></button>'; }).join("");
    drawCart();
  }
  function loadCart() { try { var a = JSON.parse(localStorage.getItem(storeKey) || "[]"); cart = Array.isArray(a) ? a.filter(function (r) { return product(r.id) && product(r.id).available !== false && r.qty > 0; }) : []; } catch (e) { cart = []; } }
  function saveCart() { try { localStorage.setItem(storeKey, JSON.stringify(cart)); } catch (e) {} }
  function total() { return cart.reduce(function (s, r) { return s + Number(product(r.id).price) * r.qty; }, 0); }
  function drawCart() { $("#cartCount").textContent = cart.reduce(function (s, x) { return s + x.qty; }, 0); $("#cartTotal").textContent = money(total()); $("#checkoutTotal").textContent = money(total()); $("#toCheckout").disabled = !cart.length; $("#cartList").innerHTML = cart.length ? cart.map(function (r) { var p = product(r.id); return '<div class="cart-row"><div class="cart-row-top"><strong>' + esc(p.name) + '</strong><button class="remove-btn" data-remove="' + p.id + '">Видалити</button></div><div class="cart-row-bot"><div class="qty"><button data-qty="-1" data-id="' + p.id + '">−</button><output>' + r.qty + '</output><button data-qty="1" data-id="' + p.id + '">+</button></div><div class="line"><b>' + money(Number(p.price) * r.qty) + '</b></div></div></div>'; }).join("") : '<p class="cart-empty">Кошик порожній. Оберіть страви в каталозі.</p>'; }
  function view(name) { ["viewCart", "checkoutForm", "viewDone"].forEach(function (id) { $("#" + id).hidden = id !== ({ cart: "viewCart", form: "checkoutForm", done: "viewDone" }[name]); }); $("#drawerTitle").textContent = name === "form" ? "Оформлення" : name === "done" ? "Готово" : "Кошик"; }
  function openCart() { $("#overlay").hidden = false; document.body.classList.add("lock"); view("cart"); }
  function closeCart() { $("#overlay").hidden = true; document.body.classList.remove("lock"); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    if (t.dataset.category) { activeCategory = t.dataset.category; draw(); }
    if (t.dataset.add) { var p = product(t.dataset.add), row = cart.filter(function (x) { return Number(x.id) === Number(t.dataset.add); })[0]; if (!p || p.available === false) return; if (row) row.qty++; else cart.push({ id: Number(p.id), qty: 1 }); saveCart(); drawCart(); }
    if (t.dataset.remove) { cart = cart.filter(function (x) { return Number(x.id) !== Number(t.dataset.remove); }); saveCart(); drawCart(); }
    if (t.dataset.qty) { var q = cart.filter(function (x) { return Number(x.id) === Number(t.dataset.id); })[0]; if (q) q.qty += Number(t.dataset.qty); cart = cart.filter(function (x) { return x.qty > 0; }); saveCart(); drawCart(); }
    if (t.dataset.action === "open-cart") openCart(); if (t.dataset.action === "close-cart") closeCart(); if (t.dataset.action === "to-checkout" && cart.length) view("form"); if (t.dataset.action === "back-cart") view("cart");
    if (t.dataset.slide) { var i = Number(t.dataset.slide); document.querySelectorAll(".plate").forEach(function (x, n) { x.classList.toggle("is-active", n === i); x.classList.toggle("is-wait", n !== i); }); document.querySelectorAll(".tx").forEach(function (x, n) { x.classList.toggle("t-active", n === i); x.classList.toggle("t-off", n !== i); }); document.querySelectorAll(".thumb").forEach(function (x, n) { x.setAttribute("aria-pressed", String(n === i)); }); }
  });
  $("#overlay").addEventListener("click", function (e) { if (e.target === this) closeCart(); });
  $("#checkoutForm").addEventListener("change", function (e) { if (e.target.name === "delivery") $("#addressField").hidden = e.target.value !== "delivery"; });
  $("#checkoutForm").addEventListener("submit", async function (e) {
    e.preventDefault(); var f = e.currentTarget; if (!cart.length) return;
    if (f.elements.website.value) return;
    var order = { order_number: "PM-" + Date.now().toString(36).toUpperCase(), customer_name: f.elements.name.value.trim(), phone: f.elements.phone.value.trim(), delivery: f.elements.delivery.value, address: f.elements.delivery.value === "delivery" ? f.elements.address.value.trim() : "", comment: f.elements.comment.value.trim(), items: cart.map(function (r) { var p = product(r.id); return { id: p.id, name: p.name, price: Number(p.price), qty: r.qty, sum: Number(p.price) * r.qty }; }), total: total() };
    var button = $("#submitBtn"); button.disabled = true; button.textContent = "Надсилаємо…"; $("#formError").textContent = "";
    try {
      if (!client) throw new Error("Потрібно налаштувати Supabase у assets/js/config.js.");
      var result = await client.from("orders").insert(order).select("order_number").single(); if (result.error) throw result.error;
      $("#orderNumber").textContent = result.data.order_number; cart = []; saveCart(); drawCart(); f.reset(); $("#addressField").hidden = true; view("done");
    } catch (err) { $("#formError").textContent = "Не вдалося зберегти замовлення. " + (err.message || "Спробуйте ще раз або зателефонуйте нам."); }
    button.disabled = false; button.textContent = "Підтвердити замовлення";
  });
  async function start() {
    loadCart();
    if (client) {
      var results = await Promise.all([client.from("products").select("*").order("sort_order"), client.from("site_settings").select("key,value")]);
      if (!results[0].error && results[0].data.length) products = results[0].data;
      if (!results[1].error) results[1].data.forEach(function (r) { settings[r.key] = r.value; });
    }
    applySettings(); draw();
  }
  start().catch(function (e) { console.error(e); draw(); });
})();
