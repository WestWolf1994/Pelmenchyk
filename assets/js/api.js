/*
 * Мінімальний клієнт Supabase (REST). Використовується сайтом та адмінкою.
 */
(function () {
  "use strict";
  var CFG = window.PELMENCHYK_CONFIG || {};
  var URL_ = (CFG.supabaseUrl || "").replace(/\/+$/, "");
  var KEY = CFG.supabaseAnonKey || "";
  var SESSION_KEY = "pelmenchyk.admin.session";

  function enabled() { return !!(URL_ && KEY); }

  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; } }
  function saveSession(s) { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) { /* ігноруємо */ } }

  function timeout(ms) {
    if (typeof AbortController === "undefined") return {};
    var c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal };
  }

  function errorFrom(res, body) {
    var msg = (body && (body.message || body.msg || body.error_description || body.error)) || ("HTTP " + res.status);
    var e = new Error(msg);
    e.status = res.status;
    return e;
  }

  function refresh(sess) {
    return fetch(URL_ + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: sess.refresh_token })
    }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw errorFrom(r, b); return b; }); })
      .then(function (b) { var s = toSession(b); saveSession(s); return s; });
  }
  function toSession(b) {
    return { access_token: b.access_token, refresh_token: b.refresh_token, email: (b.user && b.user.email) || "", expires_at: Date.now() + (b.expires_in || 3600) * 1000 - 30000 };
  }

  function token() {
    var s = loadSession();
    if (!s) return Promise.resolve(null);
    if (Date.now() < s.expires_at) return Promise.resolve(s.access_token);
    return refresh(s).then(function (n) { return n.access_token; }, function () { saveSession(null); return null; });
  }

  // Загальний запит. auth=true — від імені адміністратора.
  function request(path, opts, auth) {
    opts = opts || {};
    return (auth ? token() : Promise.resolve(null)).then(function (t) {
      if (auth && !t) { var e = new Error("Потрібен вхід"); e.status = 401; throw e; }
      var h = Object.assign({ apikey: KEY, Authorization: "Bearer " + (t || KEY) }, opts.headers || {});
      var init = Object.assign({ method: opts.method || "GET", headers: h, body: opts.body }, timeout(opts.timeoutMs || 15000));
      return fetch(URL_ + path, init).then(function (res) {
        if (res.status === 204) return null;
        return res.text().then(function (txt) {
          var body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = null; }
          if (!res.ok) { if (res.status === 401 && auth) saveSession(null); throw errorFrom(res, body); }
          return body;
        });
      });
    });
  }

  function json(o) { return JSON.stringify(o); }
  var JH = { "Content-Type": "application/json" };

  window.PM_API = {
    enabled: enabled,
    session: loadSession,
    isLoggedIn: function () { return !!loadSession(); },

    login: function (email, password) {
      return fetch(URL_ + "/auth/v1/token?grant_type=password", {
        method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
        body: json({ email: email, password: password })
      }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw errorFrom(r, b); return b; }); })
        .then(function (b) { var s = toSession(b); s.email = email; saveSession(s); return s; });
    },
    logout: function () { saveSession(null); },

    // Публічне читання меню та налаштувань
    getPublic: function () {
      return Promise.all([
        request("/rest/v1/categories?select=*&order=sort.asc,id.asc"),
        request("/rest/v1/products?select=*&order=sort.asc,id.asc"),
        request("/rest/v1/settings?select=*")
      ]).then(function (r) { return { categories: r[0], products: r[1], settings: r[2] }; });
    },
    rpc: function (name, args) { return request("/rest/v1/rpc/" + name, { method: "POST", headers: JH, body: json(args) }); },

    // Адмін
    isAdmin: function () { return request("/rest/v1/rpc/is_admin", { method: "POST", headers: JH, body: "{}" }, true); },
    orders: function (limit) { return request("/rest/v1/orders?select=*&order=created_at.desc&limit=" + (limit || 200), {}, true); },
    updateOrder: function (id, patch) { return request("/rest/v1/orders?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: Object.assign({ Prefer: "return=minimal" }, JH), body: json(patch) }, true); },
    deleteOrder: function (id) { return request("/rest/v1/orders?id=eq." + encodeURIComponent(id), { method: "DELETE" }, true); },
    allProducts: function () { return request("/rest/v1/products?select=*&order=sort.asc,id.asc", {}, true); },
    createProduct: function (p) { return request("/rest/v1/products?select=*", { method: "POST", headers: Object.assign({ Prefer: "return=representation" }, JH), body: json(p) }, true).then(function (r) { return r[0]; }); },
    updateProduct: function (id, p) { return request("/rest/v1/products?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: Object.assign({ Prefer: "return=minimal" }, JH), body: json(p) }, true); },
    deleteProduct: function (id) { return request("/rest/v1/products?id=eq." + encodeURIComponent(id), { method: "DELETE" }, true); },
    createCategory: function (c) { return request("/rest/v1/categories", { method: "POST", headers: Object.assign({ Prefer: "return=minimal" }, JH), body: json(c) }, true); },
    updateCategory: function (id, c) { return request("/rest/v1/categories?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: Object.assign({ Prefer: "return=minimal" }, JH), body: json(c) }, true); },
    deleteCategory: function (id) { return request("/rest/v1/categories?id=eq." + encodeURIComponent(id), { method: "DELETE" }, true); },
    saveSettings: function (rows) { return request("/rest/v1/settings", { method: "POST", headers: Object.assign({ Prefer: "resolution=merge-duplicates,return=minimal" }, JH), body: json(rows) }, true); },

    // Фото: завантаження у сховище «menu», повертає публічну адресу
    upload: function (blob, name, type) {
      return request("/storage/v1/object/menu/" + encodeURIComponent(name), { method: "POST", headers: { "Content-Type": type, "x-upsert": "true", "cache-control": "31536000" }, body: blob, timeoutMs: 60000 }, true)
        .then(function () { return URL_ + "/storage/v1/object/public/menu/" + encodeURIComponent(name); });
    },

    // Онлайн-оплата: Edge Function
    payment: function (action, body) {
      return fetch(URL_ + "/functions/v1/payment?action=" + action, {
        method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: json(body)
      }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw errorFrom(r, b); return b; }); });
    }
  };
})();
