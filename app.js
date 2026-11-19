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
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage can fail when the site is opened from a local file or restricted browser context.
  }

  try {
    const cookieKey = encodeURIComponent(key);
    const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${cookieKey}=`));
    if (cookie) {
      const rawValue = decodeURIComponent(cookie.split("=").slice(1).join("="));
      return JSON.parse(rawValue);
    }
  } catch {
    // Ignore cookie parse errors and fall back to default data.
  }

  try {
    const template = window.name ? JSON.parse(window.name) : {};
    if (template && Object.prototype.hasOwnProperty.call(template, key)) {
      return template[key];
    }
  } catch {
    // Ignore window.name parse errors.
  }

  return fallback;
}

function writeStore(key, value) {
  const serialised = JSON.stringify(value);

  try {
    localStorage.setItem(key, serialised);
  } catch {
    // Ignore localStorage write failures for file:// or restricted contexts.
  }

  try {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(serialised)}; path=/; SameSite=Lax`;
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

async function getMenu() {
  if (window.thefoxCloud) {
    try {
      const cloudMenu = await window.thefoxCloud.getMenu();
      if (cloudMenu.length) {
        writeStore(STORAGE_KEYS.menu, cloudMenu);
        return cloudMenu;
      }
    } catch (error) {
      console.warn("Could not load menu from Supabase; using local fallback.", error);
    }
  }

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

async function renderMenu() {
  const menuGrid = document.querySelector("#menuGrid");
  const filters = document.querySelector("#menuFilters");
  if (!menuGrid || !filters) return;

  const menu = await getMenu();
  let activeCategory = "All";

  function paint() {
    const categories = ["All", ...new Set(menu.map((item) => item.category))];
    filters.innerHTML = categories
      .map((category) => `<button class="filter-button ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">${category}</button>`)
      .join("");

    const visible = activeCategory === "All" ? menu : menu.filter((item) => item.category === activeCategory);
    menuGrid.innerHTML
      = visible
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

  async function syncMenu() {
    const updatedMenu = await getMenu();
    if (JSON.stringify(updatedMenu) !== JSON.stringify(menu)) {
      menu.splice(0, menu.length, ...updatedMenu);
    }
    paint();
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    paint();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.menu) {
      syncMenu();
    }
  });

  window.addEventListener("thefox:menu-updated", () => {
    syncMenu();
  });

  paint();
}

function subscribeToMenuUpdates() {
  if (!window.thefoxCloud) return;
  window.thefoxCloud.subscribe("menu_items", () => {
    renderMenu();
  });
}

function wireForms() {
  const reservationForm = document.querySelector("#reservationForm");
  const eventForm = document.querySelector("#eventForm");

  reservationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(reservationForm).entries());
    createRequest(reservationForm, STORAGE_KEYS.reservations);

    if (window.thefoxCloud) {
      try {
        await window.thefoxCloud.createReservation({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          customer_name: data.name,
          email: data.email,
          phone: data.phone || null,
          reservation_date: data.date,
          reservation_time: data.time,
          guests: Number(data.guests),
          status: "new",
        });
      } catch (error) {
        console.error("Supabase reservation submission failed.", error);
        document.querySelector("#reservationMessage").textContent = "Could not send reservation. Please try again.";
        return;
      }
    }

    reservationForm.reset();
    document.querySelector("#reservationMessage").textContent = "Reservation request received.";
  });

  eventForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(eventForm).entries());
    createRequest(eventForm, STORAGE_KEYS.events);

    if (window.thefoxCloud) {
      try {
        await window.thefoxCloud.createEventInquiry({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          customer_name: data.name,
          email: data.email,
          phone: data.phone,
          event_date: data.date,
          guests: Number(data.guests),
          status: "new",
        });
      } catch (error) {
        console.error("Supabase event inquiry submission failed.", error);
        document.querySelector("#eventMessage").textContent = "Could not send inquiry. Please try again.";
        return;
      }
    }

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

function wireMobileMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const nav = document.querySelector("#primaryNav");
  if (!header || !toggle || !nav) return;

  function setOpen(isOpen) {
    header.classList.toggle("menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", () => {
    setOpen(!header.classList.contains("menu-open"));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
  subscribeToMenuUpdates();
  wireForms();
  wireHero();
  wireMobileMenu();
  window.lucide?.createIcons();
});
