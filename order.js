const STORAGE_KEYS = {
  menu: "thefox.menu",
  orders: "thefox.orders",
  checkout: "thefox.checkout",
};

const DELIVERY_FEE = 200;

function readStore(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage may be blocked in some browser contexts.
  }

  try {
    const cookieKey = encodeURIComponent(key);
    const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${cookieKey}=`));
    if (cookie) {
      const raw = decodeURIComponent(cookie.split("=").slice(1).join("="));
      return JSON.parse(raw);
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
    // Ignore localStorage failures.
  }

  try {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie failures.
  }

  try {
    const payload = window.name ? JSON.parse(window.name) : {};
    payload[key] = value;
    window.name = JSON.stringify(payload);
  } catch {
    // Ignore window.name failures.
  }
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
      console.warn("Could not load Supabase menu.", error);
    }
  }

  const menu = readStore(STORAGE_KEYS.menu, []);
  return Array.isArray(menu) ? menu : [];
}

function setCart(cart) {
  writeStore(STORAGE_KEYS.checkout, cart);
}

function getCart() {
  return readStore(STORAGE_KEYS.checkout, []);
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ALL`;
}

async function addItemToCart(itemId) {
  const product = (await getMenu()).find((entry) => entry.id === itemId);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find((entry) => entry.id === itemId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: Number(product.price), quantity: 1 });
  }

  setCart(cart);
  renderCart();
}

function updateQuantity(itemId, delta) {
  const cart = getCart();
  const next = cart
    .map((entry) => {
      if (entry.id !== itemId) return entry;
      return { ...entry, quantity: Math.max(0, entry.quantity + delta) };
    })
    .filter((entry) => entry.quantity > 0);

  setCart(next);
  renderCart();
}

async function renderMenu() {
  const menuGrid = document.querySelector("#menuGrid");
  const filters = document.querySelector("#menuFilters");
  const search = document.querySelector("#menuSearch");
  if (!menuGrid || !filters) return;

  const menu = await getMenu();
  const categories = ["All", ...new Set(menu.map((item) => item.category))];
  let activeCategory = "All";

  function paint() {
    const query = search?.value.trim().toLowerCase() || "";
    const visible = menu.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    filters.innerHTML = categories
      .map((category) => `<button class="filter-button ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">${category}</button>`)
      .join("");

    menuGrid.innerHTML = visible
      .map(
        (item) => `
          <article class="delivery-card">
            <div class="delivery-card-top">
              ${item.featured ? '<span class="badge">Featured</span>' : ""}
              <button class="add-button" type="button" data-add="${item.id}" aria-label="Add ${item.name}">
                <i data-lucide="plus"></i>
              </button>
            </div>
            <div class="delivery-card-body">
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <div class="delivery-card-footer">
              <span class="category-pill">${item.category}</span>
              <span class="price">${formatMoney(item.price)}</span>
            </div>
          </article>
        `,
      )
      .join("");

    if (!visible.length) {
      menuGrid.innerHTML = '<div class="empty-state-panel">No products match your search.</div>';
    }

    window.lucide?.createIcons();
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    paint();
  });

  search?.addEventListener("input", paint);

  menuGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-add]");
    if (!trigger) return;
    addItemToCart(trigger.dataset.add);
  });

  paint();
}

function renderCart() {
  const cartItems = document.querySelector("#cartItems");
  const cartCount = document.querySelector("#cartCount");
  const subtotalEl = document.querySelector("#subtotal");
  const totalEl = document.querySelector("#total");
  if (!cartItems || !cartCount || !subtotalEl || !totalEl) return;

  const cart = getCart();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + DELIVERY_FEE;

  cartCount.textContent = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  subtotalEl.textContent = formatMoney(subtotal);
  totalEl.textContent = formatMoney(total);

  if (!cart.length) {
    cartItems.classList.add("empty");
    cartItems.innerHTML = '<p>Your cart is empty. Add a few favourites to get started.</p>';
    return;
  }

  cartItems.classList.remove("empty");
  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <div>
            <strong>${item.name}</strong>
            <span>${formatMoney(item.price)} each</span>
          </div>
          <div class="qty-controls">
            <button type="button" data-change="-${item.id}" aria-label="Decrease ${item.name}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-change="+${item.id}" aria-label="Increase ${item.name}">+</button>
          </div>
        </div>
      `,
    )
    .join("");

  cartItems.querySelectorAll("[data-change]").forEach((button) => {
    button.addEventListener("click", () => {
      const change = button.dataset.change;
      const sign = change.startsWith("-") ? -1 : 1;
      const itemId = change.replace(/[+-]/g, "");
      updateQuantity(itemId, sign);
    });
  });
}

async function placeOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const cart = getCart();
  const message = document.querySelector("#orderMessage");

  if (!cart.length) {
    message.textContent = "Please add at least one product before placing an order.";
    message.style.color = "#a8321c";
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + DELIVERY_FEE,
    customer: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      notes: data.notes || "",
    },
  };

  const orders = readStore(STORAGE_KEYS.orders, []);
  orders.unshift(order);
  writeStore(STORAGE_KEYS.orders, orders);

  if (window.thefoxCloud) {
    try {
      await window.thefoxCloud.createOrder(order);
    } catch (error) {
      console.error("Supabase order submission failed.", error);
      message.textContent = "Order could not be sent. Please try again.";
      message.style.color = "#a8321c";
      return;
    }
  }

  setCart([]);
  renderCart();
  form.reset();
  message.textContent = "Your delivery order was sent successfully.";
  message.style.color = "#315747";

  window.dispatchEvent(new CustomEvent("thefox:new-order", { detail: order }));
}

function subscribeToMenuUpdates() {
  if (!window.thefoxCloud) return;
  window.thefoxCloud.subscribe("menu_items", () => renderMenu());
}

function listenForLiveOrderUpdates() {
  const adminOpen = document.body.dataset.adminPage === "true";
  if (!adminOpen) return;

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.orders) {
      window.dispatchEvent(new CustomEvent("thefox:new-order", { detail: { fromStorage: true } }));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
  subscribeToMenuUpdates();
  renderCart();

  const orderForm = document.querySelector("#orderForm");
  orderForm?.addEventListener("submit", placeOrder);

  const search = document.querySelector("#menuSearch");
  if (search) search.value = "";

  window.lucide?.createIcons();
});
