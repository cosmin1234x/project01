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

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lei = (n) => `${n.toFixed(2).replace(".", ",")} lei`;
const leiShort = (n) => (Number.isInteger(n) ? `${n} lei` : lei(n));
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00`); d.setDate(d.getDate() + n); return isoDate(d); };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = (name) => esc(name.trim().split(/\s+/)[0]);
const CHECK = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>`;

// Ora curentă în România, indiferent de fusul orar al vizitatorului.
function roNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) };
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
const hdr = $("#hdr");
const burger = $(".hdr__burger");
const nav = $("#hdr-nav");
const onScroll = () => hdr.classList.toggle("is-solid", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
function setNav(open) {
  burger.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
  hdr.classList.toggle("menu-open", open);
  document.body.classList.toggle("lock", open);
}
burger.addEventListener("click", () => setNav(burger.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });

const navSpy = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) $$("a", nav).forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === `#${en.target.id}`));
}), { rootMargin: "-45% 0px -50% 0px" });
["meniu", "terasa", "cazare", "rezervari", "cariere", "contact"].forEach((id) => navSpy.observe(document.getElementById(id)));

// ---------- Hero slideshow ----------
const slides = $$(".slide");
const dots = $$(".hero__dots button");
let slide = 0, slideTimer;
function showSlide(i) {
  slide = (i + slides.length) % slides.length;
  slides.forEach((s, j) => s.classList.toggle("is-on", j === slide));
  dots.forEach((d, j) => { d.classList.remove("is-on"); if (j === slide) { void d.offsetWidth; d.classList.add("is-on"); } });
  $("#slide-n").textContent = String(slide + 1).padStart(2, "0");
  clearTimeout(slideTimer);
  if (!reduced) slideTimer = setTimeout(() => showSlide(slide + 1), 6000);
}
dots.forEach((d, i) => d.addEventListener("click", () => showSlide(i)));
showSlide(0);

// ---------- Reveal + parallax ----------
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
}), { threshold: 0.1 });
$$(".reveal").forEach((el) => io.observe(el));

const terrace = $(".terrace"), terraceImg = $(".terrace__img img");
addEventListener("scroll", () => {
  if (reduced) return;
  const r = terrace.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  terraceImg.style.transform = `translate3d(0, ${((r.top + r.height / 2 - innerHeight / 2) / innerHeight) * -12 - 8}%, 0)`;
}, { passive: true });

// ---------- Hours ----------
const now = roNow();
$("#hours").innerHTML = `<div class="hours">${[1, 2, 3, 4, 5, 6, 0].map((d) => {
  const h = HOURS[d], c = d === now.day ? ' class="today"' : "";
  return `<span${c}>${DAYS[d]}</span><span${c}>${h ? `${h.open} – ${h.close}` : "Închis"}</span>`;
}).join("")}</div>`;
$("#year").textContent = new Date().getFullYear();

// ---------- Menu book ----------
let MENU = [];
const ITEMS = new Map();
let cart = store.get("cr-cart", {});
const filters = new Set();
let query = "";
let chapter = 0;
const page = $("#page");
const chaptersEl = $("#chapters");

const matches = (it) =>
  (!filters.has("veg") || it.tags.includes("veg")) &&
  (!filters.has("picant") || it.tags.includes("picant")) &&
  (!filters.has("disponibil") || !it.off) &&
  (!query || norm(`${it.name} ${it.desc}`).includes(norm(query)));

function hl(text) {
  if (!query) return esc(text);
  const i = norm(text).indexOf(norm(query));
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + query.length))}</mark>${esc(text.slice(i + query.length))}`;
}
function control(it) {
  if (it.off) return `<span class="off">Indisponibil</span>`;
  const q = cart[it.id] || 0;
  return q
    ? `<span class="qty" data-id="${it.id}"><button type="button" data-dec aria-label="Scade ${esc(it.name)}">−</button><span>${q}</span><button type="button" data-inc aria-label="Încă un ${esc(it.name)}">+</button></span>`
    : `<button class="plus" type="button" data-add="${it.id}" aria-label="Adaugă ${esc(it.name)}">+</button>`;
}
function dishHtml(it, i) {
  const tags = it.tags.map((t) => `<span class="tag tag--${t}">${TAG_LABEL[t]}</span>`).join("");
  const bits = [it.weight && `<b>${esc(it.weight)}</b>`, it.desc && hl(it.desc), it.pack && "+2 lei ambalaj"].filter(Boolean).join(" · ");
  return `<li class="dish${it.off ? " is-off" : ""}" data-id="${it.id}" style="--i:${Math.min(i, 14)}">
    <div class="dish__row"><span class="dish__name">${hl(it.name)}${tags}</span><span class="dish__price">${leiShort(it.price)}</span></div>
    <div class="dish__desc">${bits}</div>
    <div class="dish__ctl">${control(it)}</div>
  </li>`;
}

function renderChapters() {
  chaptersEl.innerHTML = MENU.map((c, i) => {
    const n = c.items.filter(matches).length;
    return `<li><button type="button" role="tab" id="ch-${c.id}" aria-selected="${!query && i === chapter}" data-ch="${i}" ${n ? "" : "disabled style=\"opacity:.35\""}><i>${ROMAN[i]}</i>${c.name}<small>${n}</small></button></li>`;
  }).join("");
}

function pageHtml() {
  if (query) {
    const hits = MENU.flatMap((c) => c.items.filter(matches));
    return `<div class="page__head"><h3><i>“</i>${esc(query)}”</h3><span>${hits.length} rezultate</span></div>
      ${hits.length ? `<ul class="dishes">${hits.map(dishHtml).join("")}</ul>` : `<p class="page__empty">Nu am găsit nimic. Încearcă alt cuvânt.</p>`}`;
  }
  const c = MENU[chapter];
  const items = c.items.filter(matches);
  return `<div class="page__head"><h3><i>${ROMAN[chapter]}.</i>${c.name}</h3><span>${items.length} preparate</span></div>
    ${items.length ? `<ul class="dishes">${items.map(dishHtml).join("")}</ul>` : `<p class="page__empty">Niciun preparat pentru filtrele alese.</p>`}`;
}

let flipping = false;
function renderPage(animate = true) {
  page.setAttribute("aria-labelledby", query ? "" : `ch-${MENU[chapter].id}`);
  if (!animate || reduced) { page.innerHTML = pageHtml(); return; }
  if (flipping) return;
  flipping = true;
  page.classList.add("flip-out");
  setTimeout(() => {
    page.innerHTML = pageHtml();
    page.classList.remove("flip-out");
    page.classList.add("flip-in");
    setTimeout(() => { page.classList.remove("flip-in"); flipping = false; }, 560);
  }, 320);
}

chaptersEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ch]");
  if (!b || b.disabled) return;
  const i = Number(b.dataset.ch);
  if (i === chapter && !query) return;
  chapter = i;
  if (query) { query = ""; $("#search").value = ""; }
  renderChapters();
  renderPage();
  if (innerWidth <= 1000) b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
  const top = $(".book-ui").getBoundingClientRect().top;
  if (top < 0) $(".book-ui").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
});
chaptersEl.addEventListener("keydown", (e) => {
  const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  const btns = $$("button:not(:disabled)", chaptersEl);
  const i = btns.indexOf(document.activeElement);
  const n = btns[(i + dir + btns.length) % btns.length];
  n.focus(); n.click();
});

let searchT;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchT);
  searchT = setTimeout(() => { query = e.target.value.trim(); renderChapters(); renderPage(false); }, 150);
});
$$(".toggles button").forEach((b) => b.addEventListener("click", () => {
  const f = b.dataset.filter;
  filters.has(f) ? filters.delete(f) : filters.add(f);
  b.setAttribute("aria-pressed", String(filters.has(f)));
  renderChapters(); renderPage(false);
}));

// ---------- Cart ----------
function refreshControls(id) {
  $$(`.dish[data-id="${id}"] .dish__ctl`).forEach((el) => { el.innerHTML = control(ITEMS.get(id)); });
}
function setQty(id, q) {
  const it = ITEMS.get(id);
  if (!it || it.off) return;
  const before = cart[id] || 0;
  if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 50);
  store.set("cr-cart", cart);
  refreshControls(id);
  renderCart();
  if (q > before) { const b = $("#cart-open"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
}
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2400);
}
document.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) {
    const it = ITEMS.get(add.dataset.add);
    if (!it) return;
    setQty(it.id, (cart[it.id] || 0) + 1);
    toast(`„${it.name}” a fost adăugat`);
    if (add.classList.contains("add-txt")) {
      add.classList.add("ok"); add.textContent = "✓ Adăugat";
      setTimeout(() => { add.classList.remove("ok"); add.textContent = "+ Adaugă"; }, 1500);
    }
    return;
  }
  const q = e.target.closest(".qty");
  if (q) {
    const id = q.dataset.id;
    if (e.target.closest("[data-inc]")) setQty(id, (cart[id] || 0) + 1);
    if (e.target.closest("[data-dec]")) setQty(id, (cart[id] || 0) - 1);
  }
});

function totals() {
  let sub = 0, pack = 0, dep = 0, count = 0;
  for (const [id, q] of Object.entries(cart)) {
    const it = ITEMS.get(id);
    if (!it) continue;
    sub += it.price * q; pack += it.pack * q; dep += it.deposit * q; count += q;
  }
  return { sub, pack, dep, count, total: sub + pack + dep };
}

const orderForm = $("#order-form");
const orderDone = $("#order-done");
function renderCart() {
  const entries = Object.entries(cart).filter(([id]) => ITEMS.has(id));
  const t = totals();
  $("#cart-count").textContent = t.count;
  $("#obar-count").textContent = t.count;
  $("#obar-total").textContent = lei(t.total);
  $("#obar").hidden = t.count === 0 || !$("#cart").hidden;
  const done = !orderDone.hidden;
  $("#cart-empty").hidden = entries.length > 0 || done;
  orderForm.hidden = entries.length === 0 || done;
  $("#cart-items").hidden = done;
  $("#cart-items").innerHTML = entries.map(([id, q]) => {
    const it = ITEMS.get(id);
    return `<li><div><b>${esc(it.name)}</b><small>${it.weight ? `${esc(it.weight)} · ` : ""}${leiShort(it.price)} / buc.</small></div>
      <span class="qty" data-id="${id}"><button type="button" data-dec aria-label="Scade">−</button><span>${q}</span><button type="button" data-inc aria-label="Adaugă">+</button></span>
      <span class="lp">${lei(it.price * q)}</span></li>`;
  }).join("");
  $("#totals").innerHTML = `<dt>Produse (${t.count})</dt><dd>${lei(t.sub)}</dd>
    ${t.pack ? `<dt>Ambalaj pizza / focaccia</dt><dd>${lei(t.pack)}</dd>` : ""}
    ${t.dep ? `<dt>Garanție SGR</dt><dd>${lei(t.dep)}</dd>` : ""}
    <dt class="grand">Total</dt><dd class="grand">${lei(t.total)}</dd>`;
}

// Dialog
const dlg = $("#cart");
let lastFocus;
function openCart() {
  lastFocus = document.activeElement;
  dlg.hidden = false;
  document.body.classList.add("lock");
  renderCart();
  $(".dlg__panel", dlg).focus();
}
function closeCart() {
  dlg.hidden = true;
  document.body.classList.remove("lock");
  if (!orderDone.hidden) { orderDone.hidden = true; }
  renderCart();
  lastFocus?.focus?.();
}
$("#cart-open").addEventListener("click", openCart);
$("#obar-open").addEventListener("click", openCart);
dlg.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeCart(); });
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dlg.hidden) closeCart();
  if (e.key === "Escape" && nav.classList.contains("open")) setNav(false);
  // keep focus inside the dialog
  if (e.key === "Tab" && !dlg.hidden) {
    const f = $$("button, input, select, textarea, a[href]", dlg).filter((x) => !x.closest("[hidden]") && x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

function syncMode() {
  const livrare = orderForm.elements.mode.value === "livrare";
  $("#addr-field").hidden = !livrare;
  $("input", $("#addr-field")).required = livrare;
  $("#delivery-note").textContent = livrare
    ? "Taxa de livrare (dacă e cazul) și timpul estimat îți sunt confirmate telefonic."
    : "Te sunăm când comanda e gata de ridicat de la Str. Prieteniei, Bloc A8.";
}
orderForm.addEventListener("change", (e) => { if (e.target.name === "mode") syncMode(); });
const saved = store.get("cr-customer", {});
["name", "phone", "address"].forEach((k) => { if (saved[k]) orderForm.elements[k].value = saved[k]; });

// ---------- Validation + submit helpers ----------
function validate(form, extra) {
  const err = $(".form__err", form);
  err.hidden = true;
  const fields = $$("input:not([type=radio]), select, textarea", form).filter((f) => !f.closest("[hidden]"));
  fields.forEach((f) => f.classList.remove("bad"));
  const bad = fields.filter((f) => !f.checkValidity() || (f.type === "tel" && f.value && f.value.replace(/\D/g, "").length < 9));
  const msg = bad.length ? "Te rugăm să completezi corect câmpurile marcate." : extra?.();
  if (bad.length || msg) {
    bad.forEach((f) => { void f.offsetWidth; f.classList.add("bad"); });
    bad[0]?.focus();
    err.textContent = msg;
    err.hidden = false;
    return false;
  }
  return true;
}
$$("form").forEach((f) => f.addEventListener("input", (e) => e.target.classList.remove("bad")));

async function post(url, data) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "A apărut o eroare.");
  return body;
}
function showDone(el, title, text, refLabel, ref, againLabel, onAgain) {
  el.innerHTML = `${CHECK}<h3>${title}</h3><p>${text}</p><p class="ref">${refLabel}: <b>${esc(ref)}</b></p><button class="btn btn--line" type="button">${againLabel}</button>`;
  el.hidden = false;
  $("button", el).addEventListener("click", onAgain);
  el.focus();
}
async function submitWith(form, btnText, fn) {
  const btn = $("button[type=submit]", form);
  btn.disabled = true; btn.textContent = "Se trimite…";
  try { await fn(); }
  catch (err) { const e = $(".form__err", form); e.textContent = `${err.message} Ne poți suna la 0765 466 777.`; e.hidden = false; }
  finally { btn.disabled = false; btn.textContent = btnText; }
}

orderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate(orderForm)) return;
  const data = Object.fromEntries(new FormData(orderForm));
  data.items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  submitWith(orderForm, "Trimite comanda", async () => {
    const r = await post("/api/order", data);
    store.set("cr-customer", { name: data.name, phone: data.phone, address: data.address });
    cart = {}; store.set("cr-cart", cart);
    $$(".dish").forEach((d) => refreshControls(d.dataset.id));
    showDone(orderDone, "Comanda a fost trimisă!",
      `Mulțumim, ${first(data.name)}! Total: ${lei(r.total)}. ${data.mode === "livrare" ? "Te sunăm pentru confirmare și timpul de livrare." : "Te sunăm când comanda e gata de ridicat."}`,
      "Număr comandă", r.reference, "Închide", closeCart);
    renderCart();
  });
});

// ---------- Reservation ----------
const bookForm = $("#book-form");
const bDate = $("#b-date"), bTime = $("#b-time"), bGuests = $("#b-guests");
for (let n = 1; n <= MAX_GUESTS; n++) bGuests.add(new Option(`${n} ${n === 1 ? "persoană" : "persoane"}`, n, false, n === 2));
function slotsFor(dateStr) {
  const h = HOURS[new Date(`${dateStr}T12:00`).getDay()];
  if (!h) return [];
  const t = roNow(), out = [];
  for (let m = toMin(h.open); m <= toMin(h.close) - LAST_BOOKING_BEFORE_CLOSE; m += SLOT_MINUTES) {
    if (dateStr !== t.date || m > t.min + 30) out.push(toTime(m));
  }
  return out;
}
function fillTimes() {
  const prev = bTime.value;
  bTime.innerHTML = "";
  const slots = bDate.value ? slotsFor(bDate.value) : [];
  if (!slots.length) return bTime.add(new Option(bDate.value ? "Nu mai sunt ore libere" : "Alege data", ""));
  slots.forEach((s) => bTime.add(new Option(s, s, false, s === prev)));
}
function defaultDate() {
  bDate.value = slotsFor(now.date).length ? now.date : addDays(now.date, 1);
  fillTimes();
}
bDate.min = now.date; bDate.max = addDays(now.date, 60);
bDate.addEventListener("change", fillTimes);
defaultDate();

bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate(bookForm)) return;
  const data = Object.fromEntries(new FormData(bookForm));
  data.guests = Number(data.guests);
  submitWith(bookForm, "Trimite rezervarea", async () => {
    const r = await post("/api/book", data);
    const when = new Date(`${data.date}T12:00`).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    bookForm.hidden = true;
    showDone($("#book-done"), "Mulțumim!",
      `${first(data.name)}, am primit rezervarea pentru ${data.guests} ${data.guests === 1 ? "persoană" : "persoane"}, ${when}, ora ${data.time}. Te sunăm pentru confirmare.`,
      "Cod rezervare", r.reference, "Altă rezervare", () => {
        bookForm.reset(); bGuests.value = "2"; defaultDate();
        $("#book-done").hidden = true; bookForm.hidden = false;
      });
  });
});

// ---------- Accommodation request ----------
const stayForm = $("#stay-form");
const sIn = $("#s-in"), sOut = $("#s-out"), sGuests = $("#s-guests");
for (let n = 1; n <= 20; n++) sGuests.add(new Option(`${n} ${n === 1 ? "persoană" : "persoane"}`, n, false, n === 1));
sIn.min = now.date; sIn.max = addDays(now.date, 365);
sIn.value = addDays(now.date, 1);
sOut.min = addDays(sIn.value, 1); sOut.value = addDays(sIn.value, 1);
sIn.addEventListener("change", () => {
  if (!sIn.value) return;
  sOut.min = addDays(sIn.value, 1);
  if (!sOut.value || sOut.value <= sIn.value) sOut.value = addDays(sIn.value, 1);
});
stayForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate(stayForm, () => (sOut.value <= sIn.value ? "Data plecării trebuie să fie după data sosirii." : ""))) return;
  const data = Object.fromEntries(new FormData(stayForm));
  data.guests = Number(data.guests);
  submitWith(stayForm, "Trimite solicitarea", async () => {
    const r = await post("/api/cazare", data);
    const nights = Math.round((new Date(`${data.checkout}T12:00`) - new Date(`${data.checkin}T12:00`)) / 86400000);
    stayForm.hidden = true;
    showDone($("#stay-done"), "Solicitare trimisă!",
      `${first(data.name)}, am primit cererea pentru ${data.guests} ${data.guests === 1 ? "persoană" : "persoane"}, ${nights} ${nights === 1 ? "noapte" : "nopți"}. Te contactăm cu disponibilitatea și oferta.`,
      "Cod solicitare", r.reference, "Altă solicitare", () => {
        stayForm.reset(); sIn.value = addDays(now.date, 1); sOut.value = addDays(sIn.value, 1);
        $("#stay-done").hidden = true; stayForm.hidden = false;
      });
  });
});

// ---------- Jobs: build the mailto subject ----------
const jobRole = $("#job-role"), jobMail = $("#job-mail");
const syncJob = () => { jobMail.href = `mailto:resurseumane@casa-romaneasca.eu?subject=${encodeURIComponent(`CV - ${jobRole.value.trim() || "post"}`)}`; };
jobRole.addEventListener("input", syncJob);
$("#jobs-form").addEventListener("submit", (e) => { e.preventDefault(); jobMail.click(); });
syncJob();

// ---------- Load menu ----------
fetch("/menu.json")
  .then((r) => r.json())
  .then((data) => {
    MENU = data;
    data.forEach((c) => c.items.forEach((it) => ITEMS.set(it.id, it)));
    for (const id of Object.keys(cart)) if (!ITEMS.has(id) || ITEMS.get(id).off) delete cart[id];
    renderChapters();
    renderPage(false);
    renderCart();
    syncMode();
  })
  .catch(() => { page.innerHTML = `<p class="page__empty">Meniul nu s-a putut încărca. Sună-ne la 0765 466 777.</p>`; });
