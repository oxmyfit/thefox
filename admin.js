const STORAGE_KEYS = {
  menu: "thefox.menu",
  reservations: "thefox.reservations",
  events: "thefox.events",
};

const defaultMenu = [
  { id: "eggs-benedict", category: "Brunch Favorites", name: "Eggs Benedict", description: "Poached eggs, hollandaise, smoked ham.", price: 490, featured: true },
  { id: "avocado-toast", category: "Brunch Favorites", name: "Avocado Toast", description: "Avocado, sourdough, herbs, lemon oil.", price: 450, featured: false },
  { id: "french-toast", category: "Brunch Favorites", name: "French Toast", description: "Berries, honey, brioche, vanilla cream.", price: 550, featured: true },
  { id: "fox-breakfast", category: "Brunch Favorites", name: "Fox Breakfast Plate", description: "Sausages, fried eggs, avocado, feta cheese.", price: 550, featured: false },
  { id: "mimosa", category: "Cocktails & Spritz", name: "Mimosa", description: "Prosecco and fresh orange juice.", price: 390, featured: false },
  { id: "aperol-spritz", category: "Cocktails & Spritz", name: "Aperol Spritz", description: "Aperol, prosecco, soda, orange.", price: 490, featured: true },
  { id: "smoking-fox", category: "Cocktails & Spritz", name: "Smoking Fox", description: "London Dry Gin, Aperol, orange, honey.", price: 590, featured: true },
  { id: "espresso-martini", category: "Cocktails & Spritz", name: "Espresso Martini", description: "Vodka, coffee liqueur, espresso.", price: 690, featured: false },
  { id: "negroni", category: "Cocktails & Spritz", name: "Negroni", description: "Gin, bitter, vermouth rosso.", price: 650, featured: false },
  { id: "hugo-spritz", category: "Cocktails & Spritz", name: "Hugo Spritz", description: "Elderflower, prosecco, mint, soda.", price: 490, featured: false },
  { id: "freddo-cappuccino", category: "Coffee & Soft Drinks", name: "Freddo Cappuccino", description: "Chilled espresso, milk foam, cocoa.", price: 220, featured: false },
  { id: "fresh-orange", category: "Coffee & Soft Drinks", name: "Fresh Orange Juice", description: "Pressed to order.", price: 280, featured: false },
  { id: "house-red", category: "Wine & Spirits", name: "House Red Wine", description: "Smooth glass pour for dinner and lounge nights.", price: 450, featured: false },
  { id: "gin-tonic", category: "Wine & Spirits", name: "Premium Gin Tonic", description: "Botanical gin, tonic, citrus peel.", price: 620, featured: true },
];

const form = document.querySelector("#menuForm");
const rows = document.querySelector("#adminMenuRows");
const search = document.querySelector("#menuSearch");
const gateForm = document.querySelector("#gateForm");
const gateMessage = document.querySelector("#gateMessage");
const ACCESS_HASH = "1776dc47634a98b57669c04590e086cb07b44155ba3e4920933b38d78c200461";
const ACCESS_MASK = [43, 10, 7, 28, 15, 3, 15, 92, 94, 92, 88, 46];
const SESSION_KEY = "thefox.admin.unlocked";

async function digestCode(value) {
  if (!crypto.subtle) return "";
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function matchesFallback(value) {
  return [...value].map((char) => char.charCodeAt(0) ^ 110).every((code, index) => code === ACCESS_MASK[index]) && value.length === ACCESS_MASK.length;
}

async function canUnlock(value) {
  const code = String(value).trim();
  try {
    return (await digestCode(code)) === ACCESS_HASH || matchesFallback(code);
  } catch {
    return matchesFallback(code);
  }
}

function unlockDashboard() {
  document.body.classList.remove("locked");
  document.querySelector("#adminGate").hidden = true;
  document.querySelectorAll(".protected-content").forEach((element) => {
    element.hidden = false;
  });
  renderAll();
  syncCloudMenu();
  window.lucide?.createIcons();
}

function readStore(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage can fail on restricted file:// contexts.
  }

  try {
    const cookieKey = encodeURIComponent(key);
    const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${cookieKey}=`));
    if (cookie) {
      const rawValue = decodeURIComponent(cookie.split("=").slice(1).join("="));
      return JSON.parse(rawValue);
    }
  } catch {
    // Ignore cookie parse errors.
  }

  try {
    const payload = window.name ? JSON.parse(window.name) : {};
    if (payload && Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key];
    }
  } catch {
    // Ignore window.name parse errors.
  }

  return fallback;
}

function writeStore(key, value) {
  const serialized = JSON.stringify(value);

  try {
    localStorage.setItem(key, serialized);
  } catch {
    // Ignore localStorage write failures for restricted browser contexts.
  }

  try {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie write failures.
  }

  try {
    const payload = window.name ? JSON.parse(window.name) : {};
    payload[key] = value;
    window.name = JSON.stringify(payload);
  } catch {
    // Ignore window.name write failures.
  }
}

function notifyMenuUpdate() {
  window.dispatchEvent(new CustomEvent("thefox:menu-updated", { detail: { menu: getMenu() } }));
}

function getMenu() {
  const menu = readStore(STORAGE_KEYS.menu, null);
  if (menu) return menu;
  writeStore(STORAGE_KEYS.menu, defaultMenu);
  return defaultMenu;
}

async function setMenu(menu) {
  writeStore(STORAGE_KEYS.menu, menu);
  if (window.thefoxCloud) {
    try {
      await window.thefoxCloud.saveMenu(menu);
    } catch (error) {
      console.error("Supabase menu save failed.", error);
    }
  }
  notifyMenuUpdate();
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function resetForm() {
  form.reset();
  form.elements.id.value = "";
  document.querySelector("#formTitle").textContent = "Add Menu Item";
}

function renderMenuRows() {
  const term = search.value.trim().toLowerCase();
  const menu = getMenu().filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
    return haystack.includes(term);
  });

  rows.innerHTML = menu
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${item.name}</strong><br />
            <span>${item.description}</span>
          </td>
          <td>${item.category}</td>
          <td>${Number(item.price).toLocaleString("en-US")} ALL</td>
          <td>${item.featured ? '<span class="badge">Featured</span>' : "Standard"}</td>
          <td>
            <div class="table-actions">
              <button class="mini-button" type="button" data-edit="${escapeAttr(item.id)}" title="Edit ${escapeAttr(item.name)}" aria-label="Edit ${escapeAttr(item.name)}">
                <i data-lucide="pencil"></i>
              </button>
              <button class="mini-button danger" type="button" data-delete="${escapeAttr(item.id)}" title="Delete ${escapeAttr(item.name)}" aria-label="Delete ${escapeAttr(item.name)}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  window.lucide?.createIcons();
}

let selectedReservationDate = new Date().toISOString().slice(0, 10);

function formatReservationDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

async function renderRequests(key, targetId) {
  const target = document.querySelector(targetId);
  if (!target) return;

  let reservations = [];
  let events = [];

  if (window.thefoxCloud) {
    try {
      reservations = await window.thefoxCloud.getReservations();
      events = await window.thefoxCloud.getEventInquiries();
    } catch (error) {
      console.warn("Could not load cloud requests.", error);
    }
  }

  if (!reservations.length) {
    reservations = readStore(STORAGE_KEYS.reservations, []);
  }
  if (!events.length) {
    events = readStore(STORAGE_KEYS.events, []);
  }

  const datedReservations = reservations.filter((item) => item.reservation_date === selectedReservationDate);
  const datedEvents = events.filter((item) => (item.event_date || getCreatedDate(item.created_at)) === selectedReservationDate);

  const reservationTarget = document.querySelector("#reservationRows");
  const eventTarget = document.querySelector("#eventRows");

  document.querySelector("#reservationDateTitle").textContent = formatReservationDate(selectedReservationDate);
  document.querySelector("#reservationDate").value = selectedReservationDate;
  document.querySelector("#reservationStatCount").textContent = datedReservations.length;
  document.querySelector("#reservationStatGuests").textContent = datedReservations.reduce((sum, item) => sum + Number(item.guests || 0), 0);
  document.querySelector("#reservationStatAccepted").textContent = datedReservations.filter((item) => item.status === "accepted").length;
  document.querySelector("#reservationStatPending").textContent = datedReservations.filter((item) => item.status === "new" || !item.status).length;

  reservationTarget.innerHTML = datedReservations.length
    ? datedReservations.map((item) => `
        <div class="request-item">
          <div class="request-item-header">
            <strong>${item.customer_name || item.name}</strong>
            <span class="status-pill status-${item.status || "new"}">${item.status || "new"}</span>
          </div>
          <span>${item.reservation_time || item.time || ""} — ${item.guests || 0} guests</span>
          <span>${item.email || ""} ${item.phone || ""}</span>
          <div class="order-actions">
            <button class="accept-order" type="button" data-reservation-action="accepted" data-reservation-id="${item.id}">Accept</button>
            <button class="deny-order" type="button" data-reservation-action="denied" data-reservation-id="${item.id}">Deny</button>
          </div>
        </div>`).join("")
    : '<p class="empty-state">No reservations for this date.</p>';

  eventTarget.innerHTML = datedEvents.length
    ? datedEvents.map((item) => `
        <div class="request-item">
          <strong>${item.customer_name || item.name}</strong>
          <span>${item.event_date || item.date || ""} — ${item.guests || 0} guests</span>
          <span>${item.email || ""} ${item.phone || ""}</span>
        </div>`).join("")
    : '<p class="empty-state">No event inquiries for this date.</p>';

  reservationTarget.querySelectorAll("[data-reservation-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.reservationId;
      const status = button.dataset.reservationAction;
      if (window.thefoxCloud) {
        try {
          await window.thefoxCloud.updateReservationStatus(id, status);
        } catch (error) {
          console.error("Could not update reservation.", error);
        }
      }
      renderAll();
    });
  });
}

function getCreatedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function renderAll() {
  renderMenuRows();
  await renderRequests(STORAGE_KEYS.reservations, "#reservationRows");
}

async function syncCloudMenu() {
  if (!window.thefoxCloud) return;
  try {
    const menu = await window.thefoxCloud.getMenu();
    if (menu.length) {
      writeStore(STORAGE_KEYS.menu, menu);
      renderAll();
    }
  } catch (error) {
    console.warn("Could not synchronize admin menu from Supabase.", error);
  }
}

window.thefoxCloud?.subscribe("menu_items", () => syncCloudMenu());

gateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(gateForm).get("code");
  if (await canUnlock(code)) {
    sessionStorage.setItem(SESSION_KEY, "1");
    gateForm.reset();
    unlockDashboard();
    return;
  }
  gateMessage.textContent = "Incorrect code.";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const id = data.id || crypto.randomUUID();
  const item = {
    id,
    name: data.name.trim(),
    description: data.description.trim(),
    category: data.category,
    price: Number(data.price),
    featured: data.featured === "on",
  };
  const menu = getMenu();
  const nextMenu = data.id ? menu.map((entry) => (entry.id === id ? item : entry)) : [item, ...menu];
  await setMenu(nextMenu);
  resetForm();
  renderAll();
});

rows.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const item = getMenu().find((entry) => entry.id === editButton.dataset.edit);
    if (!item) return;
    form.elements.id.value = item.id;
    form.elements.name.value = item.name;
    form.elements.description.value = item.description;
    form.elements.category.value = item.category;
    form.elements.price.value = item.price;
    form.elements.featured.checked = item.featured;
    document.querySelector("#formTitle").textContent = "Edit Menu Item";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteButton) {
    setMenu(getMenu().filter((entry) => entry.id !== deleteButton.dataset.delete)).then(() => renderAll());
  }
});

search.addEventListener("input", renderMenuRows);
document.querySelector("#clearForm").addEventListener("click", resetForm);
document.querySelector("#resetMenu").addEventListener("click", async () => {
  await setMenu(defaultMenu);
  resetForm();
  renderAll();
});
document.querySelector("#exportMenu").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getMenu(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "thefox-menu.json";
  link.click();
  URL.revokeObjectURL(url);
});
document.querySelector("#todayReservations")?.addEventListener("click", () => {
  selectedReservationDate = new Date().toISOString().slice(0, 10);
  renderAll();
});
document.querySelector("#reservationDate")?.addEventListener("change", (event) => {
  if (!event.target.value) return;
  selectedReservationDate = event.target.value;
  renderAll();
});

window.thefoxCloud?.subscribe("reservations", () => renderAll());
window.thefoxCloud?.subscribe("event_inquiries", () => renderAll());

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    unlockDashboard();
    return;
  }
  window.lucide?.createIcons();
});
