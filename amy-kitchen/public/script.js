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
const pretty = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`; };
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Loader ----------
addEventListener("load", () => {
  setTimeout(() => {
    document.body.classList.remove("is-loading");
    setTimeout(() => document.body.classList.add("is-ready"), 350);
  }, reducedMotion ? 0 : 900);
});
// Safety net in case "load" is slow (e.g. map iframe).
setTimeout(() => { document.body.classList.remove("is-loading"); document.body.classList.add("is-ready"); }, 3500);

// ---------- Petals ----------
const petals = $(".petals");
function spawnPetal(burst = false) {
  const p = document.createElement("span");
  p.className = "petal";
  const size = 8 + Math.random() * 10;
  p.style.left = `${Math.random() * 100}vw`;
  p.style.width = `${size}px`;
  p.style.height = `${size * 1.25}px`;
  p.style.background = ["#e8a0b8", "#f2bfd0", "#b7c6b1", "#fbe4ea"][Math.floor(Math.random() * 4)];
  p.style.setProperty("--drift", `${(Math.random() - 0.5) * 240}px`);
  p.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
  p.style.animationDuration = `${(burst ? 3 : 9) + Math.random() * 5}s`;
  p.addEventListener("animationend", () => p.remove());
  petals.append(p);
}
if (!reducedMotion) {
  setInterval(() => { if (!document.hidden && petals.childElementCount < 14) spawnPetal(); }, 1400);
}

// ---------- Nav ----------
const nav = $(".nav");
const toggle = $(".nav__toggle");
const links = $("#nav-links");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  links.classList.toggle("is-open", !open);
});
links.addEventListener("click", (e) => {
  if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); links.classList.remove("is-open"); }
});

// ---------- Scroll effects ----------
const terraceBg = $(".terrace__bg");
const terrace = $(".terrace");
function onScroll() {
  nav.classList.toggle("is-scrolled", scrollY > 10);
  if (reducedMotion) return;
  const r = terrace.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) {
    const progress = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    terraceBg.style.transform = `translate3d(0, ${progress * -12}%, 0)`;
  }
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Count-up stats
const countIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target;
    const target = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const start = performance.now();
    const dur = reducedMotion ? 1 : 1600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(dec);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
});
document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

// ---------- Menu ----------
const tabsEl = $(".tabs");
const panel = $("#menu-panel");
const pill = document.createElement("span");
pill.className = "tabs__pill";
tabsEl.append(pill);

function movePill(tab) {
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
}

function renderMenu(section) {
  const cards = section.items.map(([name, price, desc, diet], i) => `
    <article class="dish" style="--i:${i}">
      <div class="dish__row">
        <h3>${name}${diet ? ` <span class="tag${diet === "VG" ? " tag--vg" : ""}">${diet}</span>` : ""}</h3>
        <span class="price">${price}</span>
      </div>
      ${desc ? `<p>${desc}</p>` : ""}
    </article>`).join("");
  panel.setAttribute("aria-labelledby", `tab-${section.id}`);
  panel.innerHTML = `
    <p class="menu__meta">${section.meta}</p>
    <div class="menu__grid">${cards}</div>
    ${section.foot ? `<p class="menu__foot">${section.foot}</p>` : ""}`;
}

const tabs = MENU.map((section, i) => {
  const b = document.createElement("button");
  b.className = "tab";
  b.id = `tab-${section.id}`;
  b.setAttribute("role", "tab");
  b.setAttribute("aria-controls", "menu-panel");
  b.textContent = section.label;
  b.addEventListener("click", () => select(i));
  b.addEventListener("keydown", (e) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    const n = (i + dir + MENU.length) % MENU.length;
    select(n);
    tabs[n].focus();
  });
  tabsEl.append(b);
  return b;
});

function select(i) {
  tabs.forEach((t, j) => {
    t.setAttribute("aria-selected", String(i === j));
    t.tabIndex = i === j ? 0 : -1;
  });
  movePill(tabs[i]);
  const t = tabs[i];
  tabsEl.scrollTo({ left: t.offsetLeft - (tabsEl.clientWidth - t.offsetWidth) / 2, behavior: reducedMotion ? "auto" : "smooth" });
  renderMenu(MENU[i]);
}
select(0);
addEventListener("resize", () => movePill(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
document.fonts?.ready.then(() => movePill(tabs.find((t) => t.getAttribute("aria-selected") === "true")));

// ---------- Hours ----------
const today = new Date().getDay();
const hoursList = document.createElement("div");
hoursList.className = "hours";
[1, 2, 3, 4, 5, 6, 0].forEach((d) => {
  const h = HOURS[d];
  const day = document.createElement("span");
  const time = document.createElement("span");
  day.textContent = DAY_NAMES[d];
  time.textContent = h ? `${pretty(h.open)} – ${pretty(h.close)}` : "Closed";
  if (d === today) day.className = time.className = "is-today";
  hoursList.append(day, time);
});
$("#hours-list").append(hoursList);
$("#year").textContent = new Date().getFullYear();

// ---------- Booking ----------
const form = $("#booking-form");
const dateEl = $("#date");
const timeEl = $("#time");
const errorEl = $(".form__error", form);
const submitBtn = $('button[type="submit"]', form);
const confirmEl = $("#confirm");
const guestsOut = $("#guests-out");
const [minusBtn, plusBtn] = form.querySelectorAll(".stepper__btn");
let guests = 2;

function setGuests(n) {
  guests = Math.max(1, Math.min(MAX_GUESTS, n));
  guestsOut.innerHTML = `<b>${guests}</b> ${guests === 1 ? "guest" : "guests"}`;
  const b = $("b", guestsOut);
  b.classList.add("bump");
  minusBtn.disabled = guests === 1;
  plusBtn.disabled = guests === MAX_GUESTS;
}
form.querySelectorAll(".stepper__btn").forEach((btn) =>
  btn.addEventListener("click", () => setGuests(guests + Number(btn.dataset.step)))
);
setGuests(2);

const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 60);
dateEl.min = isoDate(new Date());
dateEl.max = isoDate(maxDate);

function slotsFor(dateStr) {
  const h = HOURS[new Date(`${dateStr}T00:00`).getDay()];
  if (!h) return [];
  const now = new Date();
  const isToday = dateStr === isoDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slots = [];
  for (let m = toMin(h.open); m <= toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (!isToday || m > nowMin + 30) slots.push(toTime(m));
  }
  return slots;
}

function fillTimes() {
  const prev = timeEl.value;
  timeEl.innerHTML = "";
  if (!dateEl.value) return timeEl.add(new Option("Choose a date first", ""));
  const slots = slotsFor(dateEl.value);
  if (!slots.length) return timeEl.add(new Option("No tables left on this day", ""));
  timeEl.add(new Option("Choose a time", ""));
  slots.forEach((s) => timeEl.add(new Option(pretty(s), s, false, s === prev)));
}
dateEl.addEventListener("change", fillTimes);

function defaultDate() {
  const d = new Date();
  if (!slotsFor(isoDate(d)).length) d.setDate(d.getDate() + 1);
  dateEl.value = isoDate(d);
  fillTimes();
}
defaultDate();

form.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const invalid = [...form.querySelectorAll("input:not([type=radio]), select, textarea")].filter((el) => !el.checkValidity());
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  if (invalid.length) {
    // Force reflow so the shake animation replays.
    invalid.forEach((el) => { void el.offsetWidth; el.classList.add("is-invalid"); });
    invalid[0].focus();
    errorEl.textContent = "Please fill in the highlighted fields.";
    errorEl.hidden = false;
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  data.guests = guests;

  submitBtn.disabled = true;
  submitBtn.firstChild.textContent = "Booking… ";
  try {
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong.");

    const when = new Date(`${data.date}T00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    $("#confirm-text").textContent =
      `Thanks ${data.name.split(" ")[0]}! We've received your request for ${guests} ${guests === 1 ? "guest" : "guests"} (${data.seating.toLowerCase()}) on ${when} at ${pretty(data.time)}.`;
    $("#confirm-ref").textContent = body.reference;
    form.hidden = true;
    confirmEl.hidden = false;
    confirmEl.focus();
    confirmEl.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    if (!reducedMotion) for (let i = 0; i < 26; i++) setTimeout(() => spawnPetal(true), i * 40);
  } catch (err) {
    errorEl.textContent = `${err.message} Please try again, or pop in and see us.`;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.firstChild.textContent = "Request my table ";
  }
});

$("#book-again").addEventListener("click", () => {
  form.reset();
  setGuests(2);
  confirmEl.hidden = true;
  form.hidden = false;
  defaultDate();
});
