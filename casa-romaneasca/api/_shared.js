// Shared helpers for /api/order and /api/book (files starting with "_" are not exposed as routes).
//
// Delivery: if RESEND_API_KEY and NOTIFY_EMAIL_TO are set in Vercel, each order/booking is emailed
// to the restaurant (and a copy to the customer when they gave an email). Everything is also written
// to the function logs, so nothing is lost if email isn't configured yet.

// Program de funcționare. Păstrați în sincron cu public/script.js. 0 = duminică … 6 = sâmbătă.
const HOURS = {
  0: { open: "10:00", close: "22:00" },
  1: { open: "10:00", close: "22:00" },
  2: { open: "10:00", close: "22:00" },
  3: { open: "10:00", close: "22:00" },
  4: { open: "10:00", close: "22:00" },
  5: { open: "10:00", close: "22:00" },
  6: { open: "10:00", close: "22:00" },
};

const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const ref = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const phoneOk = (p) => p.replace(/\D/g, "").length >= 9;
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function roToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
}

async function readBody(req) {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  return body && typeof body === "object" ? body : null;
}

async function sendEmail({ to, subject, html, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM || "Casa Românească <onboarding@resend.dev>",
      to, subject, html, reply_to: replyTo,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const emailEnabled = () => !!(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO);
const staffTo = () => process.env.NOTIFY_EMAIL_TO.split(",").map((s) => s.trim());

function table(rows) {
  return `<table style="border-collapse:collapse">${rows.map(([k, v]) =>
    `<tr><td style="padding:4px 14px 4px 0;color:#6e6158;vertical-align:top">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join("")}</table>`;
}
const wrap = (title, inner) => `<div style="font-family:Arial,sans-serif;color:#1d1715"><h2 style="color:#9e1b22;margin:0 0 12px">${esc(title)}</h2>${inner}</div>`;

function methodGuard(req, res) {
  if (req.method === "POST") return false;
  res.setHeader("Allow", "POST");
  res.status(405).json({ error: "Metodă nepermisă." });
  return true;
}

module.exports = { HOURS, clean, esc, toMin, ref, phoneOk, emailOk, roToday, readBody, sendEmail, emailEnabled, staffTo, table, wrap, methodGuard };
