// POST /api/cazare: accommodation request (Rovimob SRL rooms), forwarded like orders and bookings.
const S = require("./_shared");

module.exports = async function handler(req, res) {
  if (S.methodGuard(req, res)) return;
  const body = await S.readBody(req);
  if (!body) return res.status(400).json({ error: "Cerere invalidă." });

  const c = {
    name: S.clean(body.name, 80),
    phone: S.clean(body.phone, 20),
    email: S.clean(body.email, 120),
    checkin: S.clean(body.checkin, 10),
    checkout: S.clean(body.checkout, 10),
    notes: S.clean(body.notes, 500),
    guests: Number(body.guests),
  };
  if (c.name.length < 2) return res.status(400).json({ error: "Te rugăm să completezi numele." });
  if (!S.phoneOk(c.phone)) return res.status(400).json({ error: "Numărul de telefon nu pare valid." });
  if (c.email && !S.emailOk(c.email)) return res.status(400).json({ error: "Adresa de e-mail nu pare validă." });
  if (!Number.isInteger(c.guests) || c.guests < 1 || c.guests > 20) return res.status(400).json({ error: "Numărul de persoane nu este valid." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(c.checkout)) return res.status(400).json({ error: "Alege datele de sosire și plecare." });
  const today = S.roToday();
  if (c.checkin < today) return res.status(400).json({ error: "Data sosirii a trecut deja." });
  if (c.checkout <= c.checkin) return res.status(400).json({ error: "Data plecării trebuie să fie după data sosirii." });
  const nights = Math.round((new Date(`${c.checkout}T00:00:00Z`) - new Date(`${c.checkin}T00:00:00Z`)) / 86400000);

  const reference = S.ref("CZ");
  console.log("CERERE CAZARE", JSON.stringify({ reference, ...c, nights, receivedAt: new Date().toISOString() }));

  if (S.emailEnabled()) {
    const html = S.wrap(`Cerere cazare ${reference}`, S.table([
      ["Nume", c.name], ["Persoane", String(c.guests)], ["Sosire", c.checkin], ["Plecare", c.checkout], ["Nopți", String(nights)],
      ["Telefon", c.phone], ["E-mail", c.email || "—"], ["Mențiuni", c.notes || "—"],
    ]));
    try {
      await S.sendEmail({ to: S.staffTo(), subject: `Cazare ${reference} · ${c.guests} pers. · ${c.checkin} → ${c.checkout}`, html, replyTo: c.email || undefined });
    } catch (e) {
      console.error("Email cazare eșuat", e.message);
      return res.status(502).json({ error: "Solicitarea nu a putut fi trimisă acum. Încearcă din nou." });
    }
  }
  return res.status(200).json({ ok: true, reference, nights });
};
