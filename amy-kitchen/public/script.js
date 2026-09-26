// Opening hours. Keep in sync with api/book.js.
// Day index follows JS Date#getDay(): 0 = Sunday … 6 = Saturday. null = closed.
const HOURS = {
  0: { open: "09:00", close: "16:00" },
  1: { open: "09:00", close: "16:00" },
  2: { open: "09:00", close: "16:00" },
  3: { open: "09:00", close: "16:00" },
  4: { open: "09:00", close: "16:00" },
  5: { open: "09:00", close: "16:00" },
  6: { open: "09:00", close: "16:00" },
};
const LAST_BOOKING_BEFORE_CLOSE = 60; // minutes
const SLOT_MINUTES = 30;
const MAX_GUESTS = 10;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MENU = [
  {
    id: "brunch", label: "Brunch", meta: "Served all day · Large / Small",
    foot: "No changes or swaps on the brunch menu.",
    items: [
      ["Full Cornish", "£15 / £13", "2 Brian Etherington's sausages, 2 bacon, 2 fried eggs, mushrooms, beans, tomatoes, hashbrowns, hog's pudding & white or granary toast"],
      ["Full Veggie", "£15 / £13", "2 vegan sausages, grilled halloumi, hashbrowns, 2 fried eggs, tomatoes, smashed avocado, mushrooms, beans, spinach & white or granary toast", "V"],
      ["Full Vegan", "£15 / £12", "2 vegan sausages, beetroot falafel bites, hashbrowns, hummus, tomatoes, smashed avocado, mushrooms, beans, spinach & white or granary toast", "VG"],
      ["Builder's Brunch", "£18", "3 Brian Etherington's sausages, 3 bacon, 3 hashbrowns, 3 fried eggs, hog's pudding, beans & 2 slices of white or granary toast"],
      ["Eggs Benedict", "£12", "Bacon, spinach, poached egg & hollandaise sauce on a toasted English muffin"],
      ["Eggs Royale", "£14", "Smoked salmon, spinach, poached egg & hollandaise sauce on a toasted English muffin"],
      ["Breakfast Flatbread", "£16", "Bacon, sausage, mushroom, baked bean base, topped with mozzarella cheese & fried egg"],
      ["Salmon Flatbread", "£17", "Smoked salmon, poached eggs, spinach & smashed avocado"],
      ["Ciabatta: 1 / 2 / 3 fillings", "£6 / £7 / £8", "Choose from bacon, sausages, eggs or veggie sausages"],
      ["Giant Toasted Teacake", "£4", "Warm, buttery and generous"],
    ],
  },
  {
    id: "sweet", label: "Waffles & Pancakes", meta: "Waffles, pancakes or cinnamon French toast · Served all day",
    foot: "All served with maple syrup.",
    items: [
      ["Southern Fried Chicken Strips", "£15", "Crispy chicken strips on your choice of waffles, pancakes or cinnamon French toast"],
      ["Berry Compote & Natural Yoghurt", "£13", "Sweet berry compote with cool natural yoghurt", "V"],
      ["Bacon & Poached Egg", "£15", "Crispy bacon and a perfectly poached egg"],
      ["Nutella, Strawberries & Squirty Cream", "£14", "The indulgent one", "V"],
    ],
  },
  {
    id: "ciabattas", label: "Ciabattas", meta: "Served 12pm – 2:30pm",
    foot: "All served with fries & side garnish.",
    items: [
      ["Mozzarella, Pesto & Tomato Melt", "£14", "Toasted ciabatta, melted mozzarella, basil pesto and tomato", "V"],
      ["Bacon, Brie & Cranberry Melt", "£15", "A classic combination, toasted until gooey"],
      ["Ham & Cheese Melt", "£14", "Simple, toasty, cheesy"],
      ["Crispy Chicken, Bacon & Smashed Avocado Club", "£16", "Crispy chicken, bacon and smashed avocado"],
      ["Battered Cod Goujon & Tartar Sauce", "£17", "Golden cod goujons with tartar sauce"],
      ["BBQ Crispy Chicken & Cheese Melt", "£15", "Crispy chicken, BBQ sauce and melted cheese"],
    ],
  },
  {
    id: "fries", label: "Loaded Fries", meta: "Served 12pm – 2:30pm",
    items: [
      ["BBQ Chicken & Bacon", "£16", "Served with mozzarella, spicy mayo & BBQ sauce, topped with pickled onions & sesame seeds"],
      ["Panko Coated Halloumi", "£15", "Served with mozzarella, smashed avocado, garlic mayo, spicy mayo & salsa, topped with pickled onions & sesame seeds", "V"],
      ["Salt & Pepper Squid", "£17", "Served with mozzarella, spicy mayo & garlic mayo, topped with pickled onions & sesame seeds"],
    ],
  },
  {
    id: "mains", label: "Main Meals", meta: "Served 12pm – 2:30pm",
    items: [
      ["Squid & Fries", "£16", "Squid chunks served with fries, garlic mayo & side salad"],
      ["Strips & Fries", "£14", "Chicken strips served with fries, BBQ sauce & side salad"],
      ["Thai Cod & Prawn Fishcakes", "£16", "With garlic mayo, served with fries & side salad topped with onions & sesame seeds"],
      ["Fish & Fries", "£19", "Served with tartar sauce & side salad"],
      ["Scampi & Fries", "£16", "Served with tartar sauce & side salad"],
      ["Ham, Eggs & Fries", "£15", "Served with a side salad"],
    ],
  },
  {
    id: "flatbreads", label: "Flatbreads", meta: "Served 12pm – 2:30pm",
    items: [
      ["Mexican Crispy Chicken", "£16", "Served with smashed avocado, salsa, jalapeños & pickled pink onions, spring onions & sesame seeds"],
      ["Salt & Pepper Squid", "£16", "Served with garlic mayo & pickled pink onions, spring onions & sesame seeds"],
      ["Beetroot Falafel & Hummus", "£14", "Served with smashed avocado, salsa & hummus. Add cajun halloumi +£2", "VG"],
    ],
  },
  {
    id: "burgers", label: "Burgers", meta: "Served 12pm – 2:30pm",
    items: [
      ["Crispy Chicken Burger", "£18", "Buttermilk chicken served with bacon, mozzarella, garlic mayo, homemade battered onion rings, fries & side salad"],
      ["The Classic Burger", "£18", "6oz beef burger served with bacon, mozzarella, salsa, homemade battered onion rings, fries & side salad"],
    ],
  },
  {
    id: "boards", label: "Sharing Boards", meta: "For two · Served 12pm – 2:30pm",
    items: [
      ["Boneless Chicken Board", "£36", "Buttermilk chicken breast, chicken strips & crispy shredded chicken with spicy mayo, garlic mayo, BBQ sauce, fries & side salads topped with onions & sesame seeds"],
      ["Seafood Sharing Board", "£38", "Cod goujons, salt & pepper squid, scampi with tartare sauce, spicy mayo, garlic mayo, fries & side salads topped with onions & sesame seeds"],
    ],
  },
  {
    id: "sides", label: "Sides", meta: "Served 12pm – 2:30pm",
    items: [
      ["Panko Halloumi Fries", "£7.00", "", "V"],
      ["Cheesy Fries", "£4.00 / £8.00", "Small or large", "V"],
      ["Fries", "£3.50 / £7.00", "Small or large", "VG"],
      ["Cheesy Garlic Bread", "£5.00", "", "V"],
      ["Garlic Bread", "£4.50", "", "V"],
      ["Onion Rings", "£4.50", "", "V"],
    ],
  },
];

const $ = (s, el = document) => el.querySelector(s);
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const pretty = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; };
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Current time in Redruth, whatever the visitor's timezone.
function ukNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { day, hh: parts.hour, mm: parts.minute, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

// ---------- Custom cursor ----------
const cursor = $(".cursor");
if (matchMedia("(pointer: fine)").matches && !reducedMotion) {
  let x = 0, y = 0, cx = 0, cy = 0;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("is-on"); });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-on"));
  addEventListener("pointerover", (e) => cursor.classList.toggle("is-big", !!e.target.closest("a, button, label, .item, .cell")));
  (function loop() {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
} else {
  cursor.remove();
  document.body.style.cursor = "auto";
}

// ---------- Nav ----------
const toggle = $(".nav__toggle");
const links = $("#nav-links");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  toggle.textContent = open ? "Menu +" : "Close ×";
  links.classList.toggle("is-open", !open);
});
links.addEventListener("click", (e) => {
  if (!e.target.closest("a")) return;
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "Menu +";
  links.classList.remove("is-open");
});

// ---------- Clock + open status ----------
function tick() {
  const now = ukNow();
  $("#clock").textContent = `${now.hh}:${now.mm}`;
  const h = HOURS[now.day];
  const open = h && now.min >= toMin(h.open) && now.min < toMin(h.close);
  const status = $("#open-status");
  $("b", status).textContent = open ? "Open now" : "Closed";
  $(".dot", status).classList.toggle("is-closed", !open);
  let detail;
  if (open) detail = `Kitchen open till ${pretty(h.close)}`;
  else if (h && now.min < toMin(h.open)) detail = `Opens today at ${pretty(h.open)}`;
  else {
    let d = (now.day + 1) % 7, n = 1;
    while (!HOURS[d] && n < 7) { d = (d + 1) % 7; n++; }
    detail = HOURS[d] ? `Opens ${n === 1 ? "tomorrow" : DAY_NAMES[d]} at ${pretty(HOURS[d].open)}` : "";
  }
  $("#open-detail").textContent = detail;
}
tick();
setInterval(tick, 15000);

// ---------- Hero letters ----------
document.querySelectorAll(".word span").forEach((s, i) => s.style.setProperty("--i", i));

// ---------- Text scramble on reveal ----------
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=?!";
function scramble(el) {
  const final = el.dataset.text;
  const len = final.length;
  let frame = 0;
  const total = 26;
  const step = () => {
    const done = Math.floor((frame / total) * len);
    el.textContent = final.split("").map((c, i) => (i < done || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join("");
    if (frame++ < total) requestAnimationFrame(step);
    else el.textContent = final;
  };
  step();
}
document.querySelectorAll("[data-scramble]").forEach((el) => { el.dataset.text = el.textContent; el.setAttribute("aria-label", el.textContent); });

const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    if (en.target.hasAttribute("data-scramble")) { if (!reducedMotion) scramble(en.target); }
    else en.target.classList.add("is-visible");
  });
}, { threshold: 0.05 });
document.querySelectorAll("[data-scramble]").forEach((el) => io.observe(el));

// ---------- Count-ups ----------
const countIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target, target = Number(el.dataset.count), dec = Number(el.dataset.decimals || 0);
    if (reducedMotion) return;
    const start = performance.now();
    const run = (now) => {
      const t = Math.min(1, (now - start) / 1500);
      el.textContent = (target * (1 - Math.pow(1 - t, 4))).toFixed(dec);
      if (t < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  });
});
document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

// ---------- Menu board ----------
const board = $("#menu-board");
const index = $("#menu-index");
board.innerHTML = MENU.map((sec) => `
  <section class="menu-sec reveal${sec.items.length > 6 ? " menu-sec--wide" : ""}" id="m-${sec.id}" aria-labelledby="h-${sec.id}">
    <div class="menu-sec__head">
      <h3 id="h-${sec.id}">${sec.label}</h3>
      <span class="menu-sec__meta">${sec.meta}</span>
    </div>
    <div class="items">
      ${sec.items.map(([name, price, desc, diet]) => `
        <div class="item">
          <div class="item__row">
            <span class="item__name">${name}${diet ? ` <span class="tag${diet === "VG" ? " tag--vg" : ""}">${diet}</span>` : ""}</span>
            <span class="item__price">${price}</span>
          </div>
          ${desc ? `<p class="item__desc">${desc}</p>` : ""}
        </div>`).join("")}
    </div>
    ${sec.foot ? `<p class="menu-sec__foot">${sec.foot}</p>` : ""}
  </section>`).join("");
index.innerHTML = MENU.map((sec, i) => `<li><a href="#m-${sec.id}">${sec.label}<span>${String(i + 1).padStart(2, "0")}</span></a></li>`).join("");
board.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Scroll-spy for the menu index
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    index.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
    const active = index.querySelector("a.is-active");
    if (active && index.scrollWidth > index.clientWidth) index.scrollTo({ left: active.offsetLeft - 20, behavior: "smooth" });
  });
}, { rootMargin: "-45% 0px -50% 0px" });
board.querySelectorAll(".menu-sec").forEach((s) => spy.observe(s));

// ---------- Roof parallax ----------
const roof = $(".roof__img");
const roofImg = $("img", roof);
addEventListener("scroll", () => {
  if (reducedMotion) return;
  const r = roof.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
  roofImg.style.transform = `translate3d(0, ${p * -10}%, 0)`;
}, { passive: true });

// ---------- Hours table ----------
const today = ukNow().day;
$("#hours").insertAdjacentHTML("beforeend", [1, 2, 3, 4, 5, 6, 0].map((d) => {
  const h = HOURS[d];
  return `<tr${d === today ? ' class="is-today"' : ""}><td>${DAY_NAMES[d]}</td><td>${h ? `${pretty(h.open)} – ${pretty(h.close)}` : "Closed"}</td></tr>`;
}).join(""));
$("#year").textContent = new Date().getFullYear();

// ---------- Booking wizard ----------
const form = $("#booking-form");
const steps = [...form.querySelectorAll(".step")];
const stepLabels = [...form.querySelectorAll(".wizard__steps li")];
const errorEl = $(".wizard__error", form);
const backBtn = $("#back"), nextBtn = $("#next"), submitBtn = $("#submit");
const dateEl = $("#date"), timeEl = $("#time");
let current = 0;
let guests = 2;

// Party size
const party = $("#party");
for (let n = 1; n <= MAX_GUESTS; n++) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = n;
  b.setAttribute("role", "radio");
  b.setAttribute("aria-label", `${n} ${n === 1 ? "guest" : "guests"}`);
  b.setAttribute("aria-checked", String(n === guests));
  b.addEventListener("click", () => {
    guests = n;
    party.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  });
  party.append(b);
}

// Days (next 21) and time slots
function slotsFor(dateStr) {
  const h = HOURS[new Date(`${dateStr}T00:00`).getDay()];
  if (!h) return [];
  const now = ukNow();
  const isToday = dateStr === isoDate(new Date());
  const out = [];
  for (let m = toMin(h.open); m <= toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (!isToday || m > now.min + 30) out.push(toTime(m));
  }
  return out;
}
const daysEl = $("#days"), slotsEl = $("#slots");
for (let i = 0; i < 21; i++) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const iso = isoDate(d);
  const b = document.createElement("button");
  b.type = "button";
  b.className = "day";
  b.dataset.date = iso;
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", "false");
  b.setAttribute("aria-label", d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
  b.innerHTML = `<small>${i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-GB", { month: "short" })}</small>`;
  b.disabled = slotsFor(iso).length === 0;
  b.addEventListener("click", () => pickDay(b));
  daysEl.append(b);
}
function pickDay(b) {
  daysEl.querySelectorAll(".day").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  dateEl.value = b.dataset.date;
  timeEl.value = "";
  const slots = slotsFor(b.dataset.date);
  slotsEl.innerHTML = slots.length ? "" : `<p class="slots__empty">No tables left on this day.</p>`;
  slots.forEach((t, i) => {
    const s = document.createElement("button");
    s.type = "button";
    s.className = "slot";
    s.style.setProperty("--i", i);
    s.textContent = pretty(t);
    s.setAttribute("role", "radio");
    s.setAttribute("aria-checked", "false");
    s.addEventListener("click", () => {
      slotsEl.querySelectorAll(".slot").forEach((x) => x.setAttribute("aria-checked", String(x === s)));
      timeEl.value = t;
      errorEl.hidden = true;
    });
    slotsEl.append(s);
  });
}
function resetDays() {
  const first = daysEl.querySelector(".day:not(:disabled)");
  if (first) pickDay(first);
  daysEl.scrollLeft = 0;
}
resetDays();

function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }

function validateStep(i) {
  errorEl.hidden = true;
  if (i === 1 && (!dateEl.value || !timeEl.value)) { showError("Pick a day and a time slot."); return false; }
  if (i === 2) {
    const fields = [...steps[2].querySelectorAll("input, textarea")];
    fields.forEach((f) => f.classList.remove("is-invalid"));
    const bad = fields.filter((f) => !f.checkValidity());
    if (bad.length) {
      bad.forEach((f) => { void f.offsetWidth; f.classList.add("is-invalid"); });
      bad[0].focus();
      showError("Please fill in the highlighted fields.");
      return false;
    }
  }
  return true;
}

function goTo(i) {
  const back = i < current;
  steps[current].hidden = true;
  current = i;
  const s = steps[current];
  s.classList.toggle("back", back);
  s.hidden = false;
  stepLabels.forEach((l, j) => { l.classList.toggle("is-active", j === i); l.classList.toggle("is-done", j < i); });
  $("#progress").style.width = `${((i + 1) / steps.length) * 100}%`;
  backBtn.hidden = i === 0;
  nextBtn.hidden = i === steps.length - 1;
  submitBtn.hidden = i !== steps.length - 1;
  errorEl.hidden = true;
  form.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
}
nextBtn.addEventListener("click", () => { if (validateStep(current)) goTo(current + 1); });
backBtn.addEventListener("click", () => goTo(current - 1));
steps[2].addEventListener("input", (e) => e.target.classList.remove("is-invalid"));

function barcode(seed) {
  let x = [...seed].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32);
  let pos = 0; const stops = [];
  while (pos < 100) {
    const bar = 0.6 + rand() * 2.2, gap = 0.6 + rand() * 1.8;
    stops.push(`#141414 ${pos}% ${pos + bar}%`, `transparent ${pos + bar}% ${pos + bar + gap}%`);
    pos += bar + gap;
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(2)) return;
  const data = Object.fromEntries(new FormData(form));
  data.guests = guests;
  submitBtn.disabled = true;
  submitBtn.textContent = "Booking…";
  try {
    const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong.");

    const when = new Date(`${data.date}T00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    $("#receipt-lines").innerHTML = [
      ["Name", data.name], ["Date", when], ["Time", pretty(data.time)],
      ["Guests", String(guests)], ["Seating", data.seating],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    $("#receipt-ref").textContent = body.reference;
    $("#barcode").style.background = barcode(body.reference);
    form.hidden = true;
    const slot = $("#receipt-slot");
    slot.hidden = false;
    const r = $("#receipt");
    r.style.animation = "none"; void r.offsetWidth; r.style.animation = "";
    slot.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
    r.focus({ preventScroll: true });
  } catch (err) {
    showError(`${err.message} Please try again, or pop in and see us.`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm booking";
  }
});

$("#again").addEventListener("click", () => {
  form.reset();
  guests = 2;
  party.querySelectorAll("button").forEach((x, i) => x.setAttribute("aria-checked", String(i === 1)));
  resetDays();
  $("#receipt-slot").hidden = true;
  form.hidden = false;
  goTo(0);
});
