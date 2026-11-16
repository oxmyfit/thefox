const STORAGE_KEYS = {
  menu: "thefox.menu",
  orders: "thefox.orders",
};

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
        </article>
      `,
    )
    .join("");
}

function playOrderSound() {
  const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

function watchForOrders() {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.orders) {
      renderOrders();
      playOrderSound();
    }
  });

  window.addEventListener("thefox:new-order", (event) => {
    if (event.detail && event.detail.id) {
      renderOrders();
      playOrderSound();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderOrders();
  watchForOrders();
  document.querySelector("#refreshOrders")?.addEventListener("click", renderOrders);
});
