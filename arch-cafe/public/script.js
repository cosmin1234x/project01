// Opening hours. Keep in sync with api/book.js.
// Day index follows JS Date#getDay(): 0 = Sunday … 6 = Saturday. null = closed.
const HOURS = {
  0: { open: "09:30", close: "16:00" },
  1: { open: "09:30", close: "16:00" },
  2: { open: "09:30", close: "16:00" },
  3: { open: "09:30", close: "16:00" },
  4: { open: "09:30", close: "16:00" },
  5: { open: "09:30", close: "16:00" },
  6: { open: "09:30", close: "16:00" },
};
const LAST_BOOKING_BEFORE_CLOSE = 90; // minutes
const SLOT_MINUTES = 30;
const MAX_GUESTS = 8;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const pretty = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---------- Nav ----------
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  links.classList.toggle("is-open", !open);
});
links.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("is-open");
  }
});
addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 10), { passive: true });

// ---------- Menu tabs ----------
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// ---------- Opening hours list ----------
const hoursEl = document.getElementById("hours-list");
const today = new Date().getDay();
const hoursList = document.createElement("div");
hoursList.className = "hours";
[1, 2, 3, 4, 5, 6, 0].forEach((d) => {
  const h = HOURS[d];
  const day = document.createElement("span");
  const time = document.createElement("span");
  day.textContent = DAY_NAMES[d];
  time.textContent = h ? `${pretty(h.open)} – ${pretty(h.close)}` : "Closed";
  if (d === today) { day.className = time.className = "is-today"; }
  hoursList.append(day, time);
});
hoursEl.append(hoursList);
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Booking form ----------
const form = document.getElementById("booking-form");
const guestsEl = form.querySelector(".guests");
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");
const errorEl = form.querySelector(".form__error");
const submitBtn = form.querySelector('button[type="submit"]');
const confirmEl = document.getElementById("confirm");
let guests = 2;

for (let n = 1; n <= MAX_GUESTS; n++) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "radio");
  b.textContent = n;
  b.setAttribute("aria-label", `${n} ${n === 1 ? "guest" : "guests"}`);
  b.setAttribute("aria-checked", String(n === guests));
  b.addEventListener("click", () => {
    guests = n;
    guestsEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  });
  guestsEl.append(b);
}

const now = new Date();
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 60);
dateEl.min = isoDate(now);
dateEl.max = isoDate(maxDate);

function slotsFor(dateStr) {
  const d = new Date(`${dateStr}T00:00`);
  const h = HOURS[d.getDay()];
  if (!h) return [];
  const slots = [];
  const isToday = dateStr === isoDate(new Date());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  for (let m = toMin(h.open); m <= toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (!isToday || m > nowMin + 30) slots.push(toTime(m));
  }
  return slots;
}

function fillTimes() {
  const val = dateEl.value;
  const prev = timeEl.value;
  timeEl.innerHTML = "";
  if (!val) {
    timeEl.add(new Option("Choose a date first", ""));
    return;
  }
  const slots = slotsFor(val);
  if (!slots.length) {
    timeEl.add(new Option("No tables left on this day", ""));
    return;
  }
  timeEl.add(new Option("Choose a time", ""));
  slots.forEach((s) => timeEl.add(new Option(pretty(s), s, false, s === prev)));
}
dateEl.addEventListener("change", fillTimes);

// Default to today if there are slots left, otherwise tomorrow.
dateEl.value = isoDate(now);
if (!slotsFor(dateEl.value).length) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  dateEl.value = isoDate(t);
}
fillTimes();

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

form.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));

  const invalid = [...form.querySelectorAll("input, select, textarea")].filter((el) => !el.checkValidity());
  if (invalid.length) {
    invalid.forEach((el) => el.classList.add("is-invalid"));
    invalid[0].focus();
    showError("Please fill in the highlighted fields.");
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  data.guests = guests;

  submitBtn.disabled = true;
  submitBtn.textContent = "Booking…";
  try {
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong.");

    const when = new Date(`${data.date}T00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    document.getElementById("confirm-text").textContent =
      `Thanks ${data.name.split(" ")[0]}! We've got your request for ${guests} ${guests === 1 ? "guest" : "guests"} on ${when} at ${pretty(data.time)}. We'll be in touch if anything changes.`;
    document.getElementById("confirm-ref").textContent = body.reference;
    form.hidden = true;
    confirmEl.hidden = false;
    confirmEl.focus();
  } catch (err) {
    showError(`${err.message} You can also call us on 07576 134385.`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Request booking";
  }
});

document.getElementById("book-again").addEventListener("click", () => {
  form.reset();
  confirmEl.hidden = true;
  form.hidden = false;
  dateEl.value = isoDate(new Date());
  if (!slotsFor(dateEl.value).length) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    dateEl.value = isoDate(t);
  }
  fillTimes();
});

// ---------- Reveal on scroll ----------
const revealTargets = document.querySelectorAll(".section__head, .dish, .about__text, .about__photos, .book__card, .visit__grid");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-visible");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
}
