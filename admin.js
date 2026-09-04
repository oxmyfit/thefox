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
  window.lucide?.createIcons();
}

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getMenu() {
  const menu = readStore(STORAGE_KEYS.menu, null);
  if (menu) return menu;
  writeStore(STORAGE_KEYS.menu, defaultMenu);
  return defaultMenu;
}

function setMenu(menu) {
  writeStore(STORAGE_KEYS.menu, menu);
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

function renderRequests(key, targetId) {
  const target = document.querySelector(targetId);
  const list = readStore(key, []);
  target.innerHTML = list.length
    ? list
        .map(
          (item) => `
            <div class="request-item">
              <strong>${item.name}</strong>
              <span>${item.date || ""} ${item.time || ""} - ${item.guests} guests</span>
              <span>${item.email || ""} ${item.phone || ""}</span>
            </div>
          `,
        )
        .join("")
    : '<p class="empty-state">No requests yet.</p>';
}

function renderAll() {
  renderMenuRows();
  renderRequests(STORAGE_KEYS.reservations, "#reservationRows");
  renderRequests(STORAGE_KEYS.events, "#eventRows");
}

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

form.addEventListener("submit", (event) => {
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
  setMenu(nextMenu);
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
    setMenu(getMenu().filter((entry) => entry.id !== deleteButton.dataset.delete));
    renderAll();
  }
});

search.addEventListener("input", renderMenuRows);
document.querySelector("#clearForm").addEventListener("click", resetForm);
document.querySelector("#resetMenu").addEventListener("click", () => {
  setMenu(defaultMenu);
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
document.querySelector("#clearReservations").addEventListener("click", () => {
  writeStore(STORAGE_KEYS.reservations, []);
  renderAll();
});
document.querySelector("#clearEvents").addEventListener("click", () => {
  writeStore(STORAGE_KEYS.events, []);
  renderAll();
});

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    unlockDashboard();
    return;
  }
  window.lucide?.createIcons();
});
