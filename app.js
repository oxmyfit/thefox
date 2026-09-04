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

function createRequest(form, key) {
  const data = Object.fromEntries(new FormData(form).entries());
  const list = readStore(key, []);
  list.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  writeStore(key, list);
}

function renderMenu() {
  const menuGrid = document.querySelector("#menuGrid");
  const filters = document.querySelector("#menuFilters");
  if (!menuGrid || !filters) return;

  const menu = getMenu();
  const categories = ["All", ...new Set(menu.map((item) => item.category))];
  let activeCategory = "All";

  function paint() {
    filters.innerHTML = categories
      .map((category) => `<button class="filter-button ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">${category}</button>`)
      .join("");

    const visible = activeCategory === "All" ? menu : menu.filter((item) => item.category === activeCategory);
    menuGrid.innerHTML = visible
      .map(
        (item) => `
          <article class="menu-card">
            <div>
              ${item.featured ? '<span class="badge">Featured</span>' : ""}
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <span class="price">${Number(item.price).toLocaleString("en-US")} ALL</span>
          </article>
        `,
      )
      .join("");
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    paint();
  });

  paint();
}

function wireForms() {
  const reservationForm = document.querySelector("#reservationForm");
  const eventForm = document.querySelector("#eventForm");

  reservationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createRequest(reservationForm, STORAGE_KEYS.reservations);
    reservationForm.reset();
    document.querySelector("#reservationMessage").textContent = "Reservation request received.";
  });

  eventForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createRequest(eventForm, STORAGE_KEYS.events);
    eventForm.reset();
    document.querySelector("#eventMessage").textContent = "Event inquiry received.";
  });
}

function wireHero() {
  const slides = [...document.querySelectorAll(".hero-slide")];
  const dots = [...document.querySelectorAll(".dot")];
  if (!slides.length) return;
  let current = 0;

  function show(index) {
    current = index % slides.length;
    slides.forEach((slide, idx) => slide.classList.toggle("active", idx === current));
    dots.forEach((dot, idx) => dot.classList.toggle("active", idx === current));
  }

  dots.forEach((dot) => dot.addEventListener("click", () => show(Number(dot.dataset.slide))));
  setInterval(() => show(current + 1), 5500);
}

document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
  wireForms();
  wireHero();
  window.lucide?.createIcons();
});
