// POST /api/book: validates a table reservation and forwards it to the restaurant.
const S = require("./_shared");
const MAX_GUESTS = 12;
const LAST_BOOKING_BEFORE_CLOSE = 60;

module.exports = async function handler(req, res) {
  if (S.methodGuard(req, res)) return;
  const body = await S.readBody(req);
  if (!body) return res.status(400).json({ error: "Cerere invalidă." });

  const b = {
    name: S.clean(body.name, 80),
    phone: S.clean(body.phone, 20),
    email: S.clean(body.email, 120),
    date: S.clean(body.date, 10),
    time: S.clean(body.time, 5),
    notes: S.clean(body.notes, 500),
    guests: Number(body.guests),
  };
  if (b.name.length < 2) return res.status(400).json({ error: "Te rugăm să completezi numele." });
  if (!S.phoneOk(b.phone)) return res.status(400).json({ error: "Numărul de telefon nu pare valid." });
  if (b.email && !S.emailOk(b.email)) return res.status(400).json({ error: "Adresa de e-mail nu pare validă." });
  if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > MAX_GUESTS) return res.status(400).json({ error: `Online primim rezervări pentru 1–${MAX_GUESTS} persoane.` });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.time)) return res.status(400).json({ error: "Alege data și ora." });

  const day = new Date(`${b.date}T00:00:00Z`);
  const ahead = Math.round((day - new Date(`${S.roToday()}T00:00:00Z`)) / 86400000);
  if (Number.isNaN(ahead) || ahead < 0) return res.status(400).json({ error: "Data aleasă a trecut deja." });
  if (ahead > 60) return res.status(400).json({ error: "Primim rezervări cu cel mult 60 de zile înainte." });
  const h = S.HOURS[day.getUTCDay()];
  if (!h) return res.status(400).json({ error: "În ziua aleasă suntem închiși." });
  const t = S.toMin(b.time);
  if (t < S.toMin(h.open) || t > S.toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE) return res.status(400).json({ error: "Alege o oră din programul nostru." });

  const reference = S.ref("RZ");
  console.log("REZERVARE NOUĂ", JSON.stringify({ reference, ...b, receivedAt: new Date().toISOString() }));

  if (S.emailEnabled()) {
    const when = new Date(`${b.date}T00:00:00Z`).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const html = S.wrap(`Rezervare ${reference}`, S.table([
      ["Nume", b.name], ["Persoane", String(b.guests)], ["Data", when], ["Ora", b.time],
      ["Telefon", b.phone], ["E-mail", b.email || "—"], ["Mențiuni", b.notes || "—"],
    ]));
    try {
      await S.sendEmail({ to: S.staffTo(), subject: `Rezervare ${reference} · ${b.guests} pers. · ${b.date} ${b.time}`, html, replyTo: b.email || undefined });
      if (b.email) await S.sendEmail({ to: [b.email], subject: `Rezervarea ta la Casa Românească (${reference})`, html }).catch((e) => console.error("Email client eșuat", e.message));
    } catch (e) {
      console.error("Email rezervare eșuat", e.message);
      return res.status(502).json({ error: "Rezervarea nu a putut fi trimisă acum. Încearcă din nou." });
    }
  }

  return res.status(200).json({ ok: true, reference });
};
