const STORAGE_KEYS = {
  menu: "thefox.menu",
  orders: "thefox.orders",
};

const ACCESS_HASH = "1776dc47634a98b57669c04590e086cb07b44155ba3e4920933b38d78c200461";
const ACCESS_MASK = [43, 10, 7, 28, 15, 3, 15, 92, 94, 92, 88, 46];
const SESSION_KEY = "thefox.admin.unlocked";
const gateForm = document.querySelector("#gateForm");
const gateMessage = document.querySelector("#gateMessage");
let selectedOrderDate = new Date().toISOString().slice(0, 10);

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

function unlockOrders() {
  document.body.classList.remove("locked");
  document.querySelector("#adminGate").hidden = true;
  document.querySelectorAll(".protected-content").forEach((element) => {
    element.hidden = false;
  });
  renderOrders();
  window.lucide?.createIcons();
}

function readStore(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage failures.
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
    // Ignore write errors.
  }

  try {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie issues.
  }

  try {
    const payload = window.name ? JSON.parse(window.name) : {};
    payload[key] = value;
    window.name = JSON.stringify(payload);
  } catch {
    // Ignore window.name issues.
  }
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ALL`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-GB");
}

let orderAudioContext = null;

function prepareOrderSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!orderAudioContext) orderAudioContext = new AudioContextClass();
  if (orderAudioContext.state === "suspended") orderAudioContext.resume();
}

function playOrderSound() {
  prepareOrderSound();
  if (!orderAudioContext) return;

  const now = orderAudioContext.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = orderAudioContext.createOscillator();
    const gain = orderAudioContext.createGain();
    const start = now + index * 0.12;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.10, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    oscillator.connect(gain);
    gain.connect(orderAudioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.23);
  });
}

async function updateOrderStatus(orderId, nextStatus) {
  const orders = readStore(STORAGE_KEYS.orders, []);
  const updated = orders.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order));
  writeStore(STORAGE_KEYS.orders, updated);

  if (window.thefoxCloud) {
    try {
      await window.thefoxCloud.updateOrderStatus(orderId, nextStatus);
    } catch (error) {
      console.error("Could not update Supabase order status.", error);
    }
  }

  await renderOrders();
}

async function renderOrders() {
  const list = document.querySelector("#ordersList");
  if (!list) return;

  let orders = readStore(STORAGE_KEYS.orders, []);
  if (window.thefoxCloud) {
    try {
      orders = await window.thefoxCloud.getOrders();
      writeStore(STORAGE_KEYS.orders, orders);
    } catch (error) {
      console.error("Could not load Supabase orders.", error);
    }
  }

  const datedOrders = orders.filter((order) => getLocalDateKey(order.createdAt) === selectedOrderDate);

  const dateKeys = [...new Set(orders.map((order) => getLocalDateKey(order.createdAt)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));

  const tabs = document.querySelector("#orderDateTabs");
  if (tabs) {
    const visibleDates = [...new Set([new Date().toISOString().slice(0, 10), ...dateKeys])].sort((a, b) => b.localeCompare(a));
    tabs.innerHTML = visibleDates
      .map((dateKey) => {
        const count = orders.filter((order) => getLocalDateKey(order.createdAt) === dateKey).length;
        return `<button type="button" class="date-tab ${dateKey === selectedOrderDate ? "active" : ""}" data-order-date="${dateKey}">
          <strong>${formatDateLabel(dateKey)}</strong>
          <span>${count} order${count === 1 ? "" : "s"}</span>
        </button>`;
      })
      .join("");

    tabs.querySelectorAll("[data-order-date]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedOrderDate = button.dataset.orderDate;
        renderOrders();
      });
    });
  }

  const accepted = datedOrders.filter((order) => order.status === "accepted").length;
  const denied = datedOrders.filter((order) => order.status === "denied").length;
  const revenue = datedOrders
    .filter((order) => order.status !== "denied")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  document.querySelector("#statOrders").textContent = datedOrders.length;
  document.querySelector("#statAccepted").textContent = accepted;
  document.querySelector("#statDenied").textContent = denied;
  document.querySelector("#statRevenue").textContent = formatPrice(revenue);

  const title = document.querySelector("#selectedDateTitle");
  if (title) title.textContent = formatDateLabel(selectedOrderDate);
  const dateInput = document.querySelector("#ordersDate");
  if (dateInput) dateInput.value = selectedOrderDate;

  orders = datedOrders;

  if (!orders.length) {
    list.innerHTML = '<div class="empty-state-panel">No delivery orders yet.</div>';
    return;
  }

  list.innerHTML = orders
    .map(
      (order) => `
        <article class="admin-order-item">
          <div class="admin-order-header">
            <div>
              <span class="status-pill status-${order.status || "new"}">${order.status || "new"}</span>
              <h3>${order.customer?.name || "Guest"}</h3>
            </div>
            <strong>${formatPrice(order.total || 0)}</strong>
          </div>

          <div class="admin-order-meta">
            <span>${order.customer?.phone || "No phone"}</span>
            <span>${formatDate(order.createdAt)}</span>
          </div>

          <p class="order-address"><strong>Address:</strong> ${order.customer?.address || "Not provided"}</p>
          <p class="order-notes"><strong>Notes:</strong> ${order.customer?.notes || "No notes"}</p>

          <ul class="order-items">
            ${(order.items || [])
              .map((item) => `<li>${item.name} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}</li>`)
              .join("")}
          </ul>

          <div class="order-actions">
            <button class="accept-order" type="button" data-order-action="accept" data-order-id="${order.id}">Accept</button>
            <button class="deny-order" type="button" data-order-action="deny" data-order-id="${order.id}">Deny</button>
          </div>
        </article>
      `,
    )
    .join("");

  list.querySelectorAll("[data-order-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const orderId = button.dataset.orderId;
      const action = button.dataset.orderAction;
      updateOrderStatus(orderId, action === "accept" ? "accepted" : "denied");
    });
  });
}

function watchForOrders() {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.orders) {
      renderOrders();
    }
  });

  if (window.thefoxCloud) {
    window.thefoxCloud.subscribe("orders", (payload) => {
      renderOrders();
      if (payload?.eventType === "INSERT") playOrderSound();
    });
  }
}

gateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  prepareOrderSound();
  const code = new FormData(gateForm).get("code");
  if (await canUnlock(code)) {
    sessionStorage.setItem(SESSION_KEY, "1");
    gateForm.reset();
    unlockOrders();
    return;
  }
  gateMessage.textContent = "Incorrect code.";
});

function bindOrderControls() {
  document.querySelector("#refreshOrders")?.addEventListener("click", async () => {
    const refreshButton = document.querySelector("#refreshOrders");
    refreshButton?.classList.add("spinning");
    await renderOrders();
    setTimeout(() => refreshButton?.classList.remove("spinning"), 350);
  });

  document.querySelector("#todayOrders")?.addEventListener("click", () => {
    selectedOrderDate = new Date().toISOString().slice(0, 10);
    renderOrders();
  });

  document.querySelector("#ordersDate")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    selectedOrderDate = event.target.value;
    renderOrders();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindOrderControls();

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    prepareOrderSound();
    unlockOrders();
    watchForOrders();
    return;
  }

  window.lucide?.createIcons();
  renderOrders();
  watchForOrders();
});

function getLocalDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
