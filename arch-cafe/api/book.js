// POST /api/book — validates a table booking and forwards it to the cafe.
//
// Delivery: if RESEND_API_KEY and BOOKING_EMAIL_TO are set in the Vercel project,
// each booking is emailed to the cafe (and a copy to the guest). The booking is
// always written to the function logs as well, so nothing is lost if email isn't set up.

// Keep in sync with public/script.js. 0 = Sunday … 6 = Saturday. null = closed.
const HOURS = {
  0: { open: "09:30", close: "16:00" },
  1: { open: "09:30", close: "16:00" },
  2: { open: "09:30", close: "16:00" },
  3: { open: "09:30", close: "16:00" },
  4: { open: "09:30", close: "16:00" },
  5: { open: "09:30", close: "16:00" },
  6: { open: "09:30", close: "16:00" },
};
const LAST_BOOKING_BEFORE_CLOSE = 90;
const MAX_GUESTS = 8;
const MAX_DAYS_AHEAD = 60;

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Today's date in the cafe's timezone, as YYYY-MM-DD.
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

function validate(body) {
  const b = {
    name: clean(body.name, 80),
    email: clean(body.email, 120),
    phone: clean(body.phone, 20),
    date: clean(body.date, 10),
    time: clean(body.time, 5),
    notes: clean(body.notes, 500),
    guests: Number(body.guests),
  };

  if (b.name.length < 2) return { error: "Please tell us your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return { error: "Please enter a valid email address." };
  if (b.phone.replace(/\D/g, "").length < 7) return { error: "Please enter a valid phone number." };
  if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > MAX_GUESTS)
    return { error: `We take online bookings for 1–${MAX_GUESTS} guests.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.time))
    return { error: "Please choose a date and time." };

  const day = new Date(`${b.date}T00:00:00Z`);
  const today = new Date(`${londonToday()}T00:00:00Z`);
  const daysAhead = Math.round((day - today) / 86400000);
  if (Number.isNaN(daysAhead) || daysAhead < 0) return { error: "That date has already passed." };
  if (daysAhead > MAX_DAYS_AHEAD) return { error: `We take bookings up to ${MAX_DAYS_AHEAD} days ahead.` };

  const hours = HOURS[day.getUTCDay()];
  if (!hours) return { error: "Sorry, we're closed that day." };
  const t = toMin(b.time);
  if (t < toMin(hours.open) || t > toMin(hours.close) - LAST_BOOKING_BEFORE_CLOSE)
    return { error: "Please pick a time within our booking hours." };

  return { booking: b };
}

async function sendEmail({ to, subject, html, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.BOOKING_EMAIL_FROM || "Arch Cafe <onboarding@resend.dev>",
      to,
      subject,
      html,
      reply_to: replyTo,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid request." });

  const { error, booking } = validate(body);
  if (error) return res.status(400).json({ error });

  const reference = "AC-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  console.log("NEW BOOKING", JSON.stringify({ reference, ...booking, receivedAt: new Date().toISOString() }));

  if (process.env.RESEND_API_KEY && process.env.BOOKING_EMAIL_TO) {
    const when = new Date(`${booking.date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    });
    const rows = [
      ["Reference", reference],
      ["Name", booking.name],
      ["Guests", String(booking.guests)],
      ["Date", when],
      ["Time", booking.time],
      ["Phone", booking.phone],
      ["Email", booking.email],
      ["Notes", booking.notes || "—"],
    ].map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5d6a5f">${k}</td><td><strong>${esc(v)}</strong></td></tr>`).join("");
    const html = `<div style="font-family:sans-serif;color:#1d2a21"><h2 style="color:#1f3d2b">Table booking</h2><table>${rows}</table></div>`;

    try {
      await sendEmail({
        to: process.env.BOOKING_EMAIL_TO.split(",").map((s) => s.trim()),
        subject: `Booking ${reference}: ${booking.guests} × ${booking.date} ${booking.time}, ${booking.name}`,
        html,
        replyTo: booking.email,
      });
      // Guest copy is best effort.
      await sendEmail({ to: [booking.email], subject: `Your Arch Cafe booking (${reference})`, html }).catch((e) =>
        console.error("Guest email failed", e.message)
      );
    } catch (e) {
      console.error("Cafe email failed", e.message);
      return res.status(502).json({ error: "We couldn't send your booking just now. Please try again." });
    }
  }

  return res.status(200).json({ ok: true, reference });
};
