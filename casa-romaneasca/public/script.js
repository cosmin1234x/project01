// Program de funcționare. Păstrați în sincron cu api/_shared.js.
// 0 = duminică … 6 = sâmbătă. null = închis.
const HOURS = {
  0: { open: "10:00", close: "22:00" },
  1: { open: "10:00", close: "22:00" },
  2: { open: "10:00", close: "22:00" },
  3: { open: "10:00", close: "22:00" },
  4: { open: "10:00", close: "22:00" },
  5: { open: "10:00", close: "22:00" },
  6: { open: "10:00", close: "22:00" },
};
const LAST_BOOKING_BEFORE_CLOSE = 60; // minute
const SLOT_MINUTES = 30;
const MAX_GUESTS = 12;
const DAYS = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const TAG_LABEL = { veg: "Vegetarian", picant: "Picant", recomandat: "Recomandat" };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lei = (n) => `${n.toFixed(2).replace(".", ",")} lei`;
const leiShort = (n) => (Number.isInteger(n) ? `${n} lei` : lei(n));
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Ora curentă în România, indiferent de fusul orar al vizitatorului.
function roNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
    min: Number(p.hour) * 60 + Number(p.minute),
  };
}

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ---------- Loader ----------
function ready() {
  document.body.classList.add("is-loaded");
  setTimeout(() => document.body.classList.add("is-ready"), reduced ? 0 : 250);
}
addEventListener("load", () => setTimeout(ready, reduced ? 0 : 900));
setTimeout(ready, 3500);

// ---------- Header ----------
const header = $(".top");
addEventListener("scroll", () => header.classList.toggle("is-scrolled", scrollY > 8), { passive: true });
const burger = $(".burger");
const nav = $("#top-nav");
burger.addEventListener("click", () => {
  const open = burger.getAttribute("aria-expanded") === "true";
  burger.setAttribute("aria-expanded", String(!open));
  nav.classList.toggle("is-open", !open);
});
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) { burger.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open"); }
});

// ---------- Reveal ----------
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
}), { threshold: 0.12 });
$$(".reveal").forEach((el) => io.observe(el));

// ---------- Hours ----------
const today = roNow();
$("#hours").innerHTML = `<div class="hours">${[1, 2, 3, 4, 5, 6, 0].map((d) => {
  const h = HOURS[d];
  const cls = d === today.day ? ' class="is-today"' : "";
  return `<span${cls}>${DAYS[d]}</span><span${cls}>${h ? `${h.open} – ${h.close}` : "Închis"}</span>`;
}).join("")}</div>`;
$("#year").textContent = new Date().getFullYear();

// ---------- Menu + cart ----------
let MENU = [];
const ITEMS = new Map();
let cart = store.get("cr-cart", {});
const filters = new Set();
let query = "";

const listEl = $("#menu-list");
const catsEl = $("#cats");

function tagsHtml(tags) {
  return tags.length ? `<span class="tags">${tags.map((t) => `<span class="tag tag--${t}">${TAG_LABEL[t]}</span>`).join("")}</span>` : "";
}
function highlight(text) {
  if (!query) return esc(text);
  const n = norm(text), q = norm(query);
  const i = n.indexOf(q);
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
}
function control(item) {
  if (item.off) return `<span class="off">Temporar indisponibil</span>`;
  const q = cart[item.id] || 0;
  return q
    ? `<span class="qty" data-id="${item.id}"><button type="button" data-dec aria-label="Scade ${esc(item.name)}">−</button><span>${q}</span><button type="button" data-inc aria-label="Adaugă încă un ${esc(item.name)}">+</button></span>`
    : `<button class="add" type="button" data-add="${item.id}" aria-label="Adaugă ${esc(item.name)} în coș">Adaugă</button>`;
}

function matches(item) {
  if (filters.has("veg") && !item.tags.includes("veg")) return false;
  if (filters.has("picant") && !item.tags.includes("picant")) return false;
  if (filters.has("disponibil") && item.off) return false;
  if (query) {
    const hay = norm(`${item.name} ${item.desc}`);
    if (!hay.includes(norm(query))) return false;
  }
  return true;
}

function renderMenu() {
  let i = 0;
  const html = MENU.map((cat) => {
    const items = cat.items.filter(matches);
    if (!items.length) return "";
    return `<section class="cat" id="cat-${cat.id}" aria-labelledby="h-${cat.id}">
      <div class="cat__head"><h3 id="h-${cat.id}">${cat.name}</h3><span>${items.length} ${items.length === 1 ? "preparat" : "preparate"}</span></div>
      <div class="dishes">${items.map((it) => `
        <article class="dish${it.off ? " is-off" : ""}" data-id="${it.id}" style="animation-delay:${Math.min(i++, 12) * 30}ms">
          <h4>${highlight(it.name)}${tagsHtml(it.tags)}</h4>
          <div class="dish__meta">${it.weight ? `<span class="w">${esc(it.weight)}</span>` : ""}${it.weight && it.desc ? " · " : ""}${highlight(it.desc)}${it.pack ? `${it.weight || it.desc ? " · " : ""}+2 lei ambalaj` : ""}</div>
          <div class="dish__right"><span class="price">${leiShort(it.price)}</span>${control(it)}</div>
        </article>`).join("")}
      </div>
    </section>`;
  }).join("");
  listEl.innerHTML = html;
  $("#menu-empty").hidden = !!html;
  catsEl.innerHTML = MENU.filter((c) => c.items.some(matches)).map((c) => `<a href="#cat-${c.id}" data-cat="${c.id}">${c.name}</a>`).join("");
  $$(".cat", listEl).forEach((s) => spy.observe(s));
}

// Scroll-spy for category chips
const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  const id = en.target.id.replace("cat-", "");
  $$("a", catsEl).forEach((a) => a.classList.toggle("is-active", a.dataset.cat === id));
  const a = $(`a[data-cat="${id}"]`, catsEl);
  if (a) catsEl.scrollTo({ left: a.offsetLeft - catsEl.clientWidth / 2 + a.offsetWidth / 2, behavior: reduced ? "auto" : "smooth" });
}), { rootMargin: "-40% 0px -55% 0px" });

// Only refresh a single dish's control instead of re-rendering the whole menu
function refreshControls(id) {
  $$(`[data-id="${id}"] .dish__right`).forEach((el) => {
    const item = ITEMS.get(id);
    el.innerHTML = `<span class="price">${leiShort(item.price)}</span>${control(item)}`;
  });
}

function setQty(id, q) {
  if (!ITEMS.has(id) || ITEMS.get(id).off) return;
  const before = cart[id] || 0;
  if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 50);
  store.set("cr-cart", cart);
  refreshControls(id);
  renderCart();
  if (q > before) {
    const b = $(".cart-btn");
    b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }
}

let toastTimer;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${action}</button>` : ""}`;
  if (action) $("button", t).addEventListener("click", openCart);
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 2800);
}

document.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) {
    const id = add.dataset.add;
    const item = ITEMS.get(id);
    if (!item) return;
    setQty(id, (cart[id] || 0) + 1);
    if (add.classList.contains("add") && !add.closest(".dish")) {
      add.classList.add("added"); add.textContent = "Adăugat ✓";
      setTimeout(() => { add.classList.remove("added"); add.textContent = "Adaugă"; }, 1400);
    }
    toast(`${item.name} a fost adăugat în coș`, "Vezi coșul");
    return;
  }
  const q = e.target.closest(".qty");
  if (q) {
    const id = q.dataset.id;
    if (e.target.closest("[data-inc]")) setQty(id, (cart[id] || 0) + 1);
    if (e.target.closest("[data-dec]")) setQty(id, (cart[id] || 0) - 1);
  }
});

// Search + filters
let searchTimer;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { query = e.target.value.trim(); renderMenu(); }, 120);
});
$$(".filter").forEach((b) => b.addEventListener("click", () => {
  const f = b.dataset.filter;
  filters.has(f) ? filters.delete(f) : filters.add(f);
  b.setAttribute("aria-pressed", String(filters.has(f)));
  renderMenu();
}));

// ---------- Cart drawer ----------
const cartEl = $("#cart");
const scrim = $("#scrim");
const cartBtn = $(".cart-btn");
const orderForm = $("#order-form");
let lastFocus;

function openCart() {
  lastFocus = document.activeElement;
  scrim.hidden = false;
  cartEl.classList.add("is-open");
  cartEl.setAttribute("aria-hidden", "false");
  cartBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("no-scroll");
  setTimeout(() => cartEl.focus(), 50);
}
function closeCart() {
  cartEl.classList.remove("is-open");
  cartEl.setAttribute("aria-hidden", "true");
  cartBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("no-scroll");
  setTimeout(() => { scrim.hidden = true; }, 300);
  lastFocus?.focus?.();
}
cartBtn.addEventListener("click", openCart);
scrim.addEventListener("click", closeCart);
$(".cart__close").addEventListener("click", closeCart);
cartEl.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeCart(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && cartEl.classList.contains("is-open")) closeCart(); });

function totals() {
  let sub = 0, pack = 0, dep = 0, count = 0;
  for (const [id, q] of Object.entries(cart)) {
    const it = ITEMS.get(id);
    if (!it) continue;
    sub += it.price * q; pack += it.pack * q; dep += it.deposit * q; count += q;
  }
  return { sub, pack, dep, count, total: sub + pack + dep };
}

function renderCart() {
  const entries = Object.entries(cart).filter(([id]) => ITEMS.has(id));
  const t = totals();
  $("#cart-count").textContent = t.count;
  const showDone = !$("#order-done").hidden;
  $("#cart-empty").hidden = entries.length > 0 || showDone;
  orderForm.hidden = entries.length === 0 || showDone;
  $("#cart-items").hidden = showDone;
  $("#cart-items").innerHTML = entries.map(([id, q]) => {
    const it = ITEMS.get(id);
    return `<li>
      <div><b>${esc(it.name)}</b><small>${it.weight ? esc(it.weight) + " · " : ""}${leiShort(it.price)} / buc.</small></div>
      <span class="line-price">${lei(it.price * q)}</span>
      <span></span>
      <span class="qty" data-id="${id}"><button type="button" data-dec aria-label="Scade">−</button><span>${q}</span><button type="button" data-inc aria-label="Adaugă">+</button></span>
    </li>`;
  }).join("");
  $("#totals").innerHTML = `
    <dt>Produse (${t.count})</dt><dd>${lei(t.sub)}</dd>
    ${t.pack ? `<dt>Ambalaj pizza / focaccia</dt><dd>${lei(t.pack)}</dd>` : ""}
    ${t.dep ? `<dt>Garanție SGR ambalaje</dt><dd>${lei(t.dep)}</dd>` : ""}
    <dt class="grand">Total</dt><dd class="grand">${lei(t.total)}</dd>`;
}

// Delivery vs pickup
function syncMode() {
  const mode = orderForm.elements.mode.value;
  const addr = $("#addr-field");
  addr.hidden = mode !== "livrare";
  $("input", addr).required = mode === "livrare";
  $("#delivery-note").textContent = mode === "livrare"
    ? "Taxa de livrare (dacă e cazul) și timpul estimat îți sunt confirmate telefonic."
    : "Te sunăm când comanda e gata de ridicat de la Str. Prieteniei, Bloc A8.";
}
orderForm.addEventListener("change", (e) => { if (e.target.name === "mode") syncMode(); });

// Restore customer details
const saved = store.get("cr-customer", {});
["name", "phone", "address"].forEach((k) => { if (saved[k]) orderForm.elements[k].value = saved[k]; });

function validate(form) {
  const err = $(".form__error", form);
  err.hidden = true;
  const fields = $$("input:not([type=radio]), select, textarea", form).filter((f) => !f.closest("[hidden]"));
  fields.forEach((f) => f.classList.remove("is-invalid"));
  const bad = fields.filter((f) => !f.checkValidity() || (f.type === "tel" && f.value && f.value.replace(/\D/g, "").length < 9));
  if (bad.length) {
    bad.forEach((f) => { void f.offsetWidth; f.classList.add("is-invalid"); });
    bad[0].focus();
    err.textContent = "Te rugăm să completezi corect câmpurile marcate.";
    err.hidden = false;
    return false;
  }
  return true;
}
$$("form").forEach((f) => f.addEventListener("input", (e) => e.target.classList.remove("is-invalid")));

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate(orderForm)) return;
  const data = Object.fromEntries(new FormData(orderForm));
  data.items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  const btn = $("#order-submit");
  btn.disabled = true; btn.textContent = "Se trimite…";
  try {
    const res = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "A apărut o eroare.");
    store.set("cr-customer", { name: data.name, phone: data.phone, address: data.address });
    $("#order-ref").textContent = body.reference;
    $("#order-done-text").textContent = data.mode === "livrare"
      ? `Mulțumim, ${data.name.split(" ")[0]}! Total: ${lei(body.total)}. Te sunăm la ${data.phone} pentru confirmare și timpul de livrare.`
      : `Mulțumim, ${data.name.split(" ")[0]}! Total: ${lei(body.total)}. Te sunăm la ${data.phone} când comanda e gata de ridicat.`;
    cart = {}; store.set("cr-cart", cart);
    $("#order-done").hidden = false;
    renderCart();
    $$(".dish").forEach((d) => refreshControls(d.dataset.id));
    $("#order-done").focus();
  } catch (err) {
    const el = $(".form__error", orderForm);
    el.textContent = `${err.message} Poți comanda și telefonic: 0765 466 777.`;
    el.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Trimite comanda";
  }
});
$("#order-again").addEventListener("click", () => { $("#order-done").hidden = true; renderCart(); closeCart(); });

// ---------- Load menu ----------
fetch("/menu.json")
  .then((r) => r.json())
  .then((data) => {
    MENU = data;
    data.forEach((c) => c.items.forEach((it) => ITEMS.set(it.id, it)));
    // Drop items that no longer exist or became unavailable
    for (const id of Object.keys(cart)) if (!ITEMS.has(id) || ITEMS.get(id).off) delete cart[id];
    renderMenu();
    renderCart();
    syncMode();
  })
  .catch(() => { listEl.innerHTML = `<p class="menu__empty">Meniul nu s-a putut încărca. Sună-ne la 0765 466 777.</p>`; });

// ---------- Rezervări ----------
const bookForm = $("#book-form");
const bDate = $("#b-date"), bTime = $("#b-time"), bGuests = $("#b-guests");
for (let n = 1; n <= MAX_GUESTS; n++) bGuests.add(new Option(`${n} ${n === 1 ? "persoană" : "persoane"}`, n, false, n === 2));

function slotsFor(dateStr) {
  const h = HOURS[new Date(`${dateStr}T12:00`).getDay()];
  if (!h) return [];
  const now = roNow();
  const out = [];
  for (let m = toMin(h.open); m <= toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (dateStr !== now.date || m > now.min + 30) out.push(toTime(m));
  }
  return out;
}
function fillTimes() {
  const prev = bTime.value;
  bTime.innerHTML = "";
  const slots = bDate.value ? slotsFor(bDate.value) : [];
  if (!slots.length) { bTime.add(new Option(bDate.value ? "Nu mai sunt ore libere" : "Alege data", "")); return; }
  slots.forEach((s) => bTime.add(new Option(s, s, false, s === prev)));
}
function defaultDate() {
  const d = new Date(`${today.date}T12:00`);
  if (!slotsFor(today.date).length) d.setDate(d.getDate() + 1);
  bDate.value = isoDate(d);
  fillTimes();
}
{
  const min = new Date(`${today.date}T12:00`);
  const max = new Date(min); max.setDate(max.getDate() + 60);
  bDate.min = isoDate(min); bDate.max = isoDate(max);
}
bDate.addEventListener("change", fillTimes);
defaultDate();

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate(bookForm)) return;
  const data = Object.fromEntries(new FormData(bookForm));
  data.guests = Number(data.guests);
  const btn = $("button[type=submit]", bookForm);
  btn.disabled = true; btn.textContent = "Se trimite…";
  try {
    const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "A apărut o eroare.");
    const when = new Date(`${data.date}T12:00`).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    $("#book-done-text").textContent = `${data.name.split(" ")[0]}, am primit rezervarea pentru ${data.guests} ${data.guests === 1 ? "persoană" : "persoane"}, ${when}, ora ${data.time}. Te sunăm pentru confirmare.`;
    $("#book-ref").textContent = body.reference;
    bookForm.hidden = true;
    $("#book-done").hidden = false;
    $("#book-done").focus();
  } catch (err) {
    const el = $(".form__error", bookForm);
    el.textContent = `${err.message} Poți rezerva și telefonic: 0765 466 777.`;
    el.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Trimite rezervarea";
  }
});
$("#book-again").addEventListener("click", () => {
  bookForm.reset();
  bGuests.value = "2";
  defaultDate();
  $("#book-done").hidden = true;
  bookForm.hidden = false;
});

// Nav highlight for top links
const sections = ["recomandari", "meniu", "rezervari", "contact"].map((id) => document.getElementById(id));
const navSpy = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) $$(".top__nav a").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
}), { rootMargin: "-45% 0px -50% 0px" });
sections.forEach((s) => navSpy.observe(s));
