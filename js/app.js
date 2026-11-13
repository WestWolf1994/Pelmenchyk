/*
 * Пельменчук — логіка сайту (чистий JavaScript, без збірки).
 * Дані: data.js, налаштування: config.js.
 */
(function () {
  "use strict";

  var CFG = window.PELMENCHYK_CONFIG || {};
  var DATA = window.PELMENCHYK_DATA || { categories: [], products: [], showcase: [] };
  var ART = window.PELMENCHYK_ART;

  var CART_KEY = "pelmenchyk.cart.v1";
  var LAST_ORDER_KEY = "pelmenchyk.lastOrderAt";
  var ORDERS_KEY = "pelmenchyk.orders.demo";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return Number(n).toLocaleString("uk-UA") + " ₴"; }
  function safeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ігноруємо */ } }

  var productById = {};
  DATA.products.forEach(function (p) { productById[p.id] = p; });
  var categoryById = {};
  DATA.categories.forEach(function (c) { categoryById[c.id] = c; });

  /* ---------- Зображення: фото або малюнок ---------- */
  function mediaHTML(item, alt) {
    if (item.image) {
      return '<img src="' + esc(item.image) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">';
    }
    return ART ? ART.svg(item.art, item.sauce) : "";
  }

  /* ---------- Категорії та фільтри ---------- */
  var activeCat = "all";

  function renderCategories() {
    $("#catGrid").innerHTML = DATA.categories.map(function (c) {
      var count = DATA.products.filter(function (p) { return p.category === c.id; }).length;
      return '<button type="button" class="cat-card" data-cat="' + esc(c.id) + '">' +
        '<div class="cat-media" style="background:' + esc(c.bg) + '">' + mediaHTML(c, c.name) + '</div>' +
        '<div class="cat-body"><strong>' + esc(c.name) + '</strong><span>' + count + ' позицій</span></div></button>';
    }).join("");
  }

  function renderFilters() {
    var items = [{ id: "all", name: "Всі" }].concat(DATA.categories);
    $("#filters").innerHTML = items.map(function (c) {
      return '<button type="button" class="pill" data-cat="' + esc(c.id) + '" aria-pressed="' + (c.id === activeCat) + '">' + esc(c.name) + '</button>';
    }).join("");
  }

  function renderProducts() {
    var list = DATA.products.filter(function (p) { return activeCat === "all" || p.category === activeCat; });
    if (!list.length) {
      $("#productGrid").innerHTML = '<p class="empty">У цій категорії поки що немає страв.</p>';
      return;
    }
    $("#productGrid").innerHTML = list.map(function (p) {
      var btn = p.available
        ? '<button type="button" class="btn btn-primary" data-add="' + p.id + '">До кошика</button>'
        : '<button type="button" class="btn btn-primary" disabled>Немає в наявності</button>';
      return '<article class="card">' +
        '<div class="card-media" style="background:' + esc((categoryById[p.category] || {}).bg || "#E4CBA8") + '">' + mediaHTML(p, p.name) + '</div>' +
        '<div class="card-body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.description) + '</p>' +
        '<div class="card-meta"><span class="price">' + money(p.price) + '</span><span class="weight">' + esc(p.weight) + '</span></div>' +
        btn + '</div></article>';
    }).join("");
  }

  function setCategory(id, scroll) {
    activeCat = id;
    renderFilters();
    renderProducts();
    if (scroll) {
      var t = $("#catalog");
      if (t) t.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    }
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- Кошик ---------- */
  var cart = []; // [{id, qty}]

  function loadCart() {
    try {
      var raw = JSON.parse(safeGet(CART_KEY) || "[]");
      cart = (Array.isArray(raw) ? raw : []).filter(function (r) {
        return r && productById[r.id] && productById[r.id].available && r.qty > 0;
      }).map(function (r) { return { id: r.id, qty: Math.min(99, Math.floor(r.qty)) }; });
    } catch (e) { cart = []; }
  }
  function saveCart() { safeSet(CART_KEY, JSON.stringify(cart)); }
  function cartCount() { return cart.reduce(function (s, r) { return s + r.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, r) { return s + r.qty * productById[r.id].price; }, 0); }

  function addToCart(id) {
    var p = productById[id];
    if (!p || !p.available) return;
    var row = cart.filter(function (r) { return r.id === id; })[0];
    if (row) row.qty = Math.min(99, row.qty + 1); else cart.push({ id: id, qty: 1 });
    saveCart();
    renderCart();
  }
  function changeQty(id, d) {
    var row = cart.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    row.qty += d;
    if (row.qty <= 0) cart = cart.filter(function (r) { return r.id !== id; });
    row.qty = Math.min(99, row.qty);
    saveCart();
    renderCart();
  }
  function removeFromCart(id) {
    cart = cart.filter(function (r) { return r.id !== id; });
    saveCart();
    renderCart();
  }

  function renderCart() {
    var count = cartCount();
    $("#cartCount").textContent = count;
    $("#cartTotal").textContent = money(cartTotal());
    $("#checkoutTotal").textContent = money(cartTotal());
    $("#toCheckout").disabled = !cart.length;
    var list = $("#cartList");
    if (!cart.length) {
      list.innerHTML = '<p class="cart-empty">Кошик порожній. Оберіть страви в каталозі.</p>';
      return;
    }
    list.innerHTML = cart.map(function (r) {
      var p = productById[r.id];
      return '<div class="cart-row"><div class="cart-row-top"><strong>' + esc(p.name) + '</strong>' +
        '<button type="button" class="remove-btn" data-remove="' + p.id + '" aria-label="Видалити: ' + esc(p.name) + '">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="cart-row-bot"><div class="qty">' +
        '<button type="button" data-dec="' + p.id + '" aria-label="Менше: ' + esc(p.name) + '">−</button>' +
        '<output aria-live="polite">' + r.qty + '</output>' +
        '<button type="button" data-inc="' + p.id + '" aria-label="Більше: ' + esc(p.name) + '">+</button></div>' +
        '<div class="line"><small>' + money(p.price) + ' × ' + r.qty + '</small><b>' + money(p.price * r.qty) + '</b></div></div></div>';
    }).join("");
  }

  /* ---------- Шторка кошика ---------- */
  var lastFocus = null;
  var views = { cart: "#viewCart", form: "#checkoutForm", done: "#viewDone" };

  function showView(name) {
    Object.keys(views).forEach(function (k) { $(views[k]).hidden = (k !== name); });
    $("#drawerTitle").textContent = name === "form" ? "Оформлення" : (name === "done" ? "Готово" : "Кошик");
  }
  function openCart() {
    lastFocus = document.activeElement;
    showView("cart");
    $("#overlay").hidden = false;
    document.body.classList.add("lock");
    $("#drawer").focus();
  }
  function closeCart() {
    $("#overlay").hidden = true;
    document.body.classList.remove("lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function trapFocus(e) {
    if ($("#overlay").hidden) return;
    if (e.key === "Escape") { closeCart(); return; }
    if (e.key !== "Tab") return;
    var f = $$("a[href], button:not([disabled]), input:not([disabled]):not([tabindex='-1']), textarea, [tabindex]:not([tabindex='-1'])", $("#drawer"))
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === $("#drawer"))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Оформлення замовлення ---------- */
  var form = $("#checkoutForm");
  var submitting = false;

  function setErr(name, msg) {
    var el = $('[data-err="' + name + '"]');
    if (el) el.textContent = msg || "";
    var input = form.elements[name];
    if (input && input.setAttribute) { if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); }
  }

  function validate() {
    var ok = true;
    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.trim();
    var digits = phone.replace(/\D/g, "");
    var delivery = form.elements.delivery.value;
    var address = form.elements.address.value.trim();

    if (name.length < 2) { setErr("name", "Вкажіть ім'я (мінімум 2 символи)."); ok = false; } else setErr("name", "");
    if (!/^[+\d\s()\-]+$/.test(phone) || digits.length < 10 || digits.length > 13) { setErr("phone", "Вкажіть коректний номер, наприклад +380501234567."); ok = false; } else setErr("phone", "");
    if (delivery === "delivery" && address.length < 5) { setErr("address", "Вкажіть адресу доставки."); ok = false; } else setErr("address", "");
    return ok;
  }

  function genOrderNumber() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var rnd = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0");
    return "PM-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + rnd;
  }

  function fetchWithTimeout(url, opts, ms) {
    if (typeof AbortController === "undefined") return fetch(url, opts);
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms);
    opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    var errBox = $("#formError");
    errBox.textContent = "";

    if (!cart.length) { errBox.textContent = "Кошик порожній."; return; }
    if (!validate()) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }

    // Пастка для ботів: приховане поле заповнене — вдаємо успіх, нічого не надсилаємо.
    var isBot = form.elements.website.value !== "";

    var cooldown = Number(CFG.orderCooldownMs) || 0;
    var last = Number(safeGet(LAST_ORDER_KEY) || 0);
    var wait = last + cooldown - Date.now();
    if (!isBot && wait > 0) {
      errBox.textContent = "Ви щойно зробили замовлення. Спробуйте ще раз через " + Math.ceil(wait / 1000) + " с.";
      return;
    }

    var order = {
      number: genOrderNumber(),
      createdAt: new Date().toISOString(),
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      delivery: form.elements.delivery.value,
      address: form.elements.delivery.value === "delivery" ? form.elements.address.value.trim() : "",
      comment: form.elements.comment.value.trim(),
      items: cart.map(function (r) {
        var p = productById[r.id];
        return { id: p.id, name: p.name, price: p.price, qty: r.qty, sum: p.price * r.qty };
      }),
      total: cartTotal()
    };

    if (isBot) { finish(order, true); return; }

    submitting = true;
    var btn = $("#submitBtn");
    btn.disabled = true;
    btn.textContent = "Надсилаємо…";

    var endpoint = (CFG.orderEndpoint || "").trim();
    if (!endpoint) {
      // ДЕМО-режим: сервера немає, зберігаємо лише в браузері клієнта.
      try {
        var all = JSON.parse(safeGet(ORDERS_KEY) || "[]");
        all.push(order);
        safeSet(ORDERS_KEY, JSON.stringify(all.slice(-20)));
      } catch (err) { /* ігноруємо */ }
      finish(order, true);
      return;
    }

    fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(order)
    }, Number(CFG.requestTimeoutMs) || 10000).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      finish(order, false);
    }).catch(function () {
      submitting = false;
      btn.disabled = false;
      btn.textContent = "Підтвердити замовлення";
      errBox.textContent = "Не вдалося надіслати замовлення. Перевірте інтернет і спробуйте ще раз або зателефонуйте нам.";
    });
  }

  function finish(order, demo) {
    safeSet(LAST_ORDER_KEY, String(Date.now()));
    cart = [];
    saveCart();
    renderCart();
    form.reset();
    $("#addressField").hidden = true;
    submitting = false;
    $("#submitBtn").disabled = false;
    $("#submitBtn").textContent = "Підтвердити замовлення";
    $("#orderNumber").textContent = order.number;
    $("#demoNote").hidden = !(demo && !(CFG.orderEndpoint || "").trim());
    showView("done");
    $("#drawer").focus();
  }

  /* ---------- Карусель страв ---------- */
  var show = { i: 0, plates: [], texts: [], thumbs: [], timer: null, userPaused: false, visible: true, busy: {} };

  function buildShowcase() {
    var items = (DATA.showcase || []).map(function (s) {
      var p = productById[s.product];
      return p && p.image ? { s: s, p: p } : null;
    }).filter(Boolean);
    if (!items.length) { var sec = $(".showcase"); if (sec) sec.hidden = true; return; }

    var stage = $("#stage"), tx = $("#txStack"), th = $("#thumbs");
    stage.innerHTML = items.map(function (it, n) {
      return '<div class="plate is-wait" data-n="' + n + '"><img src="' + esc(it.p.image) + '" alt="' + esc(it.p.name) + '" width="360" height="360"' + (n === 0 ? ' fetchpriority="high"' : ' loading="eager"') + ' decoding="async"></div>';
    }).join("");
    tx.innerHTML = items.map(function (it, n) {
      return '<div class="tx t-off" data-n="' + n + '" aria-hidden="true"><div class="tx-top"><div><div class="tx-label">Улюблене</div>' +
        '<div class="tx-l1">' + esc(it.s.line1) + '</div><div class="tx-l2">' + esc(it.s.line2) + '</div></div>' +
        '<div class="tx-badge" style="background:' + esc(it.s.badge) + '"><b>' + money(it.p.price) + '</b><small>' + esc(it.p.weight) + '</small></div></div>' +
        '<button type="button" class="btn btn-primary btn-block" data-add="' + it.p.id + '">До кошика</button></div>';
    }).join("");
    th.innerHTML = items.map(function (it, n) {
      return '<button type="button" class="thumb" data-show="' + n + '" aria-pressed="false" aria-label="' + esc(it.s.line1 + " " + it.s.line2) + '">' +
        '<img src="' + esc(it.p.image) + '" alt="" width="52" height="52" loading="eager"><span>' + esc(it.s.short) + '</span></button>';
    }).join("");

    show.plates = $$(".plate", stage);
    show.texts = $$(".tx", tx);
    show.thumbs = $$(".thumb", th);

    // Перший кадр без анімації, щоб при відкритті сторінки нічого не «влітало».
    var p0 = show.plates[0];
    p0.style.transition = "none";
    p0.classList.remove("is-wait");
    p0.classList.add("is-active");
    setText(0);
    void p0.offsetWidth;
    p0.style.transition = "";
    show.i = 0;

    startTimer();
  }

  function setText(n) {
    show.texts.forEach(function (t, k) {
      var on = k === n;
      t.classList.toggle("t-active", on);
      t.classList.toggle("t-off", !on);
      t.setAttribute("aria-hidden", on ? "false" : "true");
    });
    show.thumbs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === n ? "true" : "false"); });
  }

  function goTo(n) {
    var len = show.plates.length;
    n = ((n % len) + len) % len;
    if (n === show.i) return;
    var prev = show.plates[show.i], next = show.plates[n];

    // Усі інші тарілки гарантовано повертаємо у вихідний стан.
    show.plates.forEach(function (pl) {
      if (pl !== prev && pl !== next) { pl.classList.remove("is-active", "is-leaving"); pl.classList.add("is-wait"); }
    });
    prev.classList.remove("is-active", "is-wait");
    prev.classList.add("is-leaving");

    next.classList.remove("is-leaving", "is-wait");
    next.style.transition = "none";
    next.classList.add("is-wait");
    void next.offsetWidth;
    next.style.transition = "";
    next.classList.remove("is-wait");
    next.classList.add("is-active");

    show.i = n;
    setText(n);

    clearTimeout(show.busy.t);
    show.busy.t = setTimeout(function () {
      show.plates.forEach(function (pl, k) {
        if (k !== show.i) { pl.classList.remove("is-leaving", "is-active"); pl.classList.add("is-wait"); }
      });
    }, 900);
  }

  function canRun() {
    return !show.userPaused && show.visible && !document.hidden && show.plates.length > 1 && !reduceMotion();
  }
  function startTimer() {
    stopTimer();
    if (!canRun()) return;
    show.timer = setInterval(function () { if (canRun()) goTo(show.i + 1); }, Number(CFG.showcaseIntervalMs) || 5200);
  }
  function stopTimer() { if (show.timer) { clearInterval(show.timer); show.timer = null; } }

  function initShowcaseControls() {
    var box = $(".showcase");
    if (!box || box.hidden) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        show.visible = en[0].isIntersecting;
        show.visible ? startTimer() : stopTimer();
      }, { threshold: 0.2 }).observe(box);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stopTimer() : startTimer(); });
    $("#showPause").addEventListener("click", function () {
      show.userPaused = !show.userPaused;
      this.setAttribute("aria-pressed", String(show.userPaused));
      this.setAttribute("aria-label", show.userPaused ? "Відновити перемикання страв" : "Призупинити перемикання страв");
      show.userPaused ? stopTimer() : startTimer();
    });
    if (reduceMotion()) $("#showPause").hidden = true;
  }

  /* ---------- Події ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button, [data-cat], [data-add]") : null;
    if (!t) return;

    if (t.hasAttribute("data-add")) { addToCart(Number(t.getAttribute("data-add"))); flash(t); return; }
    if (t.hasAttribute("data-show")) { goTo(Number(t.getAttribute("data-show"))); startTimer(); return; }
    if (t.hasAttribute("data-inc")) { changeQty(Number(t.getAttribute("data-inc")), 1); return; }
    if (t.hasAttribute("data-dec")) { changeQty(Number(t.getAttribute("data-dec")), -1); return; }
    if (t.hasAttribute("data-remove")) { removeFromCart(Number(t.getAttribute("data-remove"))); return; }
    if (t.hasAttribute("data-cat")) { setCategory(t.getAttribute("data-cat"), t.classList.contains("cat-card")); return; }

    var act = t.getAttribute("data-action");
    if (act === "open-cart") openCart();
    else if (act === "close-cart") closeCart();
    else if (act === "to-checkout" && cart.length) { showView("form"); $("#f-name").focus(); }
    else if (act === "back-cart") showView("cart");
  });

  function flash(btn) {
    if (btn.classList.contains("btn")) {
      var old = btn.textContent;
      btn.textContent = "Додано ✓";
      setTimeout(function () { btn.textContent = old; }, 900);
    }
  }

  $("#overlay").addEventListener("mousedown", function (e) { if (e.target === this) closeCart(); });
  document.addEventListener("keydown", trapFocus);
  form.addEventListener("submit", onSubmit);
  $$('input[name="delivery"]', form).forEach(function (r) {
    r.addEventListener("change", function () {
      var d = form.elements.delivery.value === "delivery";
      $("#addressField").hidden = !d;
      if (!d) setErr("address", "");
    });
  });
  ["name", "phone", "address"].forEach(function (n) {
    form.elements[n].addEventListener("input", function () { setErr(n, ""); $("#formError").textContent = ""; });
  });

  // Кошик, змінений в іншій вкладці.
  window.addEventListener("storage", function (e) { if (e.key === CART_KEY) { loadCart(); renderCart(); } });

  /* ---------- Старт ---------- */
  loadCart();
  renderCategories();
  renderFilters();
  renderProducts();
  renderCart();
  buildShowcase();
  initShowcaseControls();
})();
