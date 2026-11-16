const STORAGE_KEYS = {
  menu: "thefox.menu",
  orders: "thefox.orders",
};

const ACCESS_HASH = "1776dc47634a98b57669c04590e086cb07b44155ba3e4920933b38d78c200461";
const ACCESS_MASK = [43, 10, 7, 28, 15, 3, 15, 92, 94, 92, 88, 46];
const SESSION_KEY = "thefox.admin.unlocked";
const gateForm = document.querySelector("#gateForm");
const gateMessage = document.querySelector("#gateMessage");

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

function playOrderSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.0001;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

function updateOrderStatus(orderId, nextStatus) {
  const orders = readStore(STORAGE_KEYS.orders, []);
  const updated = orders.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order));
  writeStore(STORAGE_KEYS.orders, updated);
  renderOrders();
}

function renderOrders() {
  const list = document.querySelector("#ordersList");
  if (!list) return;

  const orders = readStore(STORAGE_KEYS.orders, []);
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

gateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(gateForm).get("code");
  if (await canUnlock(code)) {
    sessionStorage.setItem(SESSION_KEY, "1");
    gateForm.reset();
    unlockOrders();
    return;
  }
  gateMessage.textContent = "Incorrect code.";
});

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    unlockOrders();
    return;
  }
  window.lucide?.createIcons();
  renderOrders();
  watchForOrders();
  document.querySelector("#refreshOrders")?.addEventListener("click", renderOrders);
});
