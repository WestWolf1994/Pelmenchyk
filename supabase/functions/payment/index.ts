// Supabase Edge Function: онлайн-оплата через WayForPay (Google Pay, Apple Pay, картка).
// Маршрути (параметр ?action=):
//   create   — сайт просить підписані поля форми оплати для замовлення { number }
//   callback — WayForPay повідомляє результат оплати (serviceUrl)
//   return   — покупця повертають із WayForPay: перенаправляємо на сайт
//
// Секрети (supabase secrets set ...): WFP_MERCHANT_ACCOUNT, WFP_SECRET_KEY, WFP_DOMAIN, SITE_URL
// Деплой: supabase functions deploy payment --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac } from "node:crypto";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MERCHANT = Deno.env.get("WFP_MERCHANT_ACCOUNT") ?? "";
const SECRET = Deno.env.get("WFP_SECRET_KEY") ?? "";
const DOMAIN = Deno.env.get("WFP_DOMAIN") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "") + "/";
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const sign = (s: string) => createHmac("md5", SECRET).update(s, "utf8").digest("hex");

// WayForPay надсилає JSON, іноді як ключ form-urlencoded тіла
function parseBody(text: string): Record<string, any> {
  try { return JSON.parse(text); } catch { /* далі */ }
  const params = new URLSearchParams(text);
  const obj: Record<string, any> = Object.fromEntries(params);
  const keys = Object.keys(obj);
  if (keys.length === 1 && keys[0].trim().startsWith("{")) {
    try { return JSON.parse(keys[0]); } catch { /* далі */ }
  }
  return obj;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const action = new URL(req.url).searchParams.get("action");

  try {
    if (action === "create") {
      if (!MERCHANT || !SECRET) return json({ error: "payment not configured" }, 500);
      const { number } = await req.json();
      const { data: order } = await sb.from("orders").select("*").eq("number", String(number)).maybeSingle();
      if (!order) return json({ error: "order not found" }, 404);
      if (order.payment_status === "paid") return json({ error: "already paid" }, 409);
      if (order.payment_method !== "online") return json({ error: "not an online order" }, 400);

      const items = order.items as { name: string; qty: number; price: number }[];
      const amount = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
      const orderReference = `${order.number}_${Date.now().toString(36)}`;
      const orderDate = Math.floor(Date.now() / 1000);
      const names = items.map((i) => i.name);
      const counts = items.map((i) => String(i.qty));
      const prices = items.map((i) => String(Number(i.price)));
      const amountStr = String(Number(amount.toFixed(2)));

      const signature = sign([MERCHANT, DOMAIN, orderReference, orderDate, amountStr, "UAH", ...names, ...counts, ...prices].join(";"));

      await sb.from("orders").update({ payment_status: "pending" }).eq("id", order.id);

      return json({
        url: "https://secure.wayforpay.com/pay",
        fields: {
          merchantAccount: MERCHANT,
          merchantAuthType: "SimpleSignature",
          merchantDomainName: DOMAIN,
          merchantSignature: signature,
          orderReference,
          orderDate: String(orderDate),
          amount: amountStr,
          currency: "UAH",
          "productName[]": names,
          "productCount[]": counts,
          "productPrice[]": prices,
          clientFirstName: order.name,
          clientPhone: order.phone,
          returnUrl: `${FN_URL}?action=return`,
          serviceUrl: `${FN_URL}?action=callback`,
          language: "UA",
        },
      });
    }

    if (action === "callback") {
      const d = parseBody(await req.text());
      const expected = sign([d.merchantAccount, d.orderReference, d.amount, d.currency, d.authCode, d.cardPan, d.transactionStatus, d.reasonCode].join(";"));
      if (!d.merchantSignature || expected !== d.merchantSignature) return json({ error: "bad signature" }, 400);

      const number = String(d.orderReference).split("_")[0];
      const { data: order } = await sb.from("orders").select("id,total,payment_status").eq("number", number).maybeSingle();
      if (order) {
        if (d.transactionStatus === "Approved" && Number(d.amount) === Number(order.total)) {
          await sb.from("orders").update({ payment_status: "paid" }).eq("id", order.id);
        } else if (order.payment_status !== "paid" && ["Declined", "Expired"].includes(d.transactionStatus)) {
          await sb.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
        }
      }
      const time = Math.floor(Date.now() / 1000);
      return json({ orderReference: d.orderReference, status: "accept", time, signature: sign(`${d.orderReference};accept;${time}`) });
    }

    if (action === "return") {
      let ref = new URL(req.url).searchParams.get("orderReference") ?? "";
      if (!ref && req.method === "POST") ref = String(parseBody(await req.text()).orderReference ?? "");
      const number = ref.split("_")[0];
      return new Response(null, { status: 303, headers: { Location: `${SITE_URL}?order=${encodeURIComponent(number)}` } });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "server error" }, 500);
  }
});
