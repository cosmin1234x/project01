// POST /api/order: validates an online order against the real menu and forwards it to the restaurant.
const MENU = require("../public/menu.json");
const S = require("./_shared");

const ITEMS = new Map();
for (const cat of MENU) for (const it of cat.items) ITEMS.set(it.id, it);
const lei = (n) => `${n.toFixed(2).replace(".", ",")} lei`;

module.exports = async function handler(req, res) {
  if (S.methodGuard(req, res)) return;
  const body = await S.readBody(req);
  if (!body) return res.status(400).json({ error: "Cerere invalidă." });

  const o = {
    name: S.clean(body.name, 80),
    phone: S.clean(body.phone, 20),
    address: S.clean(body.address, 200),
    notes: S.clean(body.notes, 500),
    mode: body.mode === "ridicare" ? "ridicare" : "livrare",
    payment: body.payment === "card" ? "card" : "numerar",
  };
  if (o.name.length < 2) return res.status(400).json({ error: "Te rugăm să completezi numele." });
  if (!S.phoneOk(o.phone)) return res.status(400).json({ error: "Numărul de telefon nu pare valid." });
  if (o.mode === "livrare" && o.address.length < 5) return res.status(400).json({ error: "Te rugăm să completezi adresa de livrare." });
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 60) return res.status(400).json({ error: "Coșul este gol." });

  // Prices always come from the server-side menu, never from the browser.
  const lines = [];
  let sub = 0, pack = 0, dep = 0;
  for (const raw of body.items) {
    const it = ITEMS.get(String(raw.id));
    const qty = Math.floor(Number(raw.qty));
    if (!it || !Number.isFinite(qty) || qty < 1 || qty > 50) return res.status(400).json({ error: "Coșul conține un produs invalid. Reîncarcă pagina." });
    if (it.off) return res.status(400).json({ error: `„${it.name}” este temporar indisponibil. Scoate-l din coș.` });
    lines.push({ name: it.name, weight: it.weight, qty, price: it.price, total: it.price * qty });
    sub += it.price * qty; pack += it.pack * qty; dep += it.deposit * qty;
  }
  const total = Math.round((sub + pack + dep) * 100) / 100;
  const reference = S.ref("CR");

  console.log("COMANDĂ NOUĂ", JSON.stringify({ reference, ...o, lines, sub, pack, dep, total, receivedAt: new Date().toISOString() }));

  if (S.emailEnabled()) {
    const items = `<table style="border-collapse:collapse;margin:12px 0">${lines.map((l) =>
      `<tr><td style="padding:3px 12px 3px 0">${l.qty} ×</td><td style="padding:3px 12px 3px 0">${S.esc(l.name)}${l.weight ? ` <small>(${S.esc(l.weight)})</small>` : ""}</td><td style="text-align:right">${lei(l.total)}</td></tr>`).join("")}</table>`;
    const html = S.wrap(`Comandă ${reference}`, S.table([
      ["Tip", o.mode === "livrare" ? "Livrare" : "Ridicare personală"],
      ["Nume", o.name], ["Telefon", o.phone],
      ...(o.mode === "livrare" ? [["Adresă", o.address]] : []),
      ["Plată", o.payment === "card" ? "Card" : "Numerar"],
      ["Mențiuni", o.notes || "—"],
    ]) + items + S.table([
      ["Produse", lei(sub)], ...(pack ? [["Ambalaj", lei(pack)]] : []), ...(dep ? [["Garanție SGR", lei(dep)]] : []), ["TOTAL", lei(total)],
    ]));
    try {
      await S.sendEmail({ to: S.staffTo(), subject: `Comandă ${reference} · ${lei(total)} · ${o.name}`, html });
    } catch (e) {
      console.error("Email comandă eșuat", e.message);
      return res.status(502).json({ error: "Comanda nu a putut fi trimisă acum. Încearcă din nou." });
    }
  }

  return res.status(200).json({ ok: true, reference, total });
};
