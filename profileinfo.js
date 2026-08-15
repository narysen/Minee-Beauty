// FIXED: Corrected API path mapping port down to 3000 to meet Express server setups
const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "https://minee-beauty-store.onrender.com/api";
let loadedDatabaseOrders = {};

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    window.location.href = "contact.html";
    return;
  }

  document.getElementById("name").innerText = user.name || "User Profile";
  document.getElementById("username").innerText = user.email
    ? `@${user.email.split("@")[0]}`
    : "@username";

  const avatar = document.getElementById("avatar");
  if (user.customAvatar) {
    avatar.src = user.customAvatar;
  }

  document.getElementById("uploadPhoto").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      avatar.src = base64Image;
      user.customAvatar = base64Image;
      localStorage.setItem("currentUser", JSON.stringify(user));
      if (user.email)
        localStorage.setItem(`account_${user.email}`, JSON.stringify(user));
    };
    reader.readAsDataURL(file);
  });

  if (!user.addressBook) user.addressBook = [];
  renderAddresses();
  loadLiveDatabaseHistory(user.name);
});

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.style.display = section.style.display === "none" ? "block" : "none";
}

function renderAddresses() {
  const list = document.getElementById("address-list");
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!list || !user) return;

  list.innerHTML = "";
  const book = user.addressBook || [];

  if (book.length === 0) {
    list.innerHTML = `<li class="py-2 text-sm text-gray-400 italic">No addresses saved yet.</li>`;
    return;
  }

  book.forEach((item, index) => {
    list.innerHTML += `
          <li class="py-2.5 border-b border-gray-100 last:border-b-0 text-sm flex justify-between items-center gap-4">
            <span class="text-gray-700 font-medium"><strong class="text-[#0099ff] font-semibold">[${item.label}]</strong> ${item.address}</span>
            <i class="fa-solid fa-trash-can text-red-500 hover:text-red-700 cursor-pointer text-sm p-1" onclick="deleteAddress(${index})"></i>
          </li>`;
  });
}

function addAddress() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const text = prompt("Enter complete street delivery address:");
  if (!text) return;
  const type =
    prompt("Enter address label (e.g., Home, Work):", "Home") || "Home";

  if (!user.addressBook) user.addressBook = [];
  user.addressBook.push({ label: type, address: text });

  localStorage.setItem("currentUser", JSON.stringify(user));
  if (user.email)
    localStorage.setItem(`account_${user.email}`, JSON.stringify(user));
  renderAddresses();
}

function deleteAddress(index) {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user || !user.addressBook) return;
  user.addressBook.splice(index, 1);
  localStorage.setItem("currentUser", JSON.stringify(user));
  if (user.email)
    localStorage.setItem(`account_${user.email}`, JSON.stringify(user));
  renderAddresses();
}

// --- FIXED: INTEGRATED LIVE SQL RELATIONAL HISTORY FETCH ---
async function loadLiveDatabaseHistory(customerName) {
  const list = document.getElementById("history-list");
  if (!list) return;

  list.innerHTML = "";
  let rawData = [];

  try {
    const response = await fetch(
      `${API_URL}/orders/${encodeURIComponent(customerName)}`,
    );
    if (response.ok) {
      rawData = await response.json();
    }
  } catch (err) {
    console.error("Database history aggregation routing error:", err);
  }

  // Group database JOIN table lines by their parent Order IDs
  loadedDatabaseOrders = {};
  rawData.forEach((row) => {
    if (!loadedDatabaseOrders[row.order_id]) {
      loadedDatabaseOrders[row.order_id] = {
        id: row.order_id,
        total: parseFloat(row.total),
        created_at: row.created_at,
        items: [],
      };
    }
    loadedDatabaseOrders[row.order_id].items.push({
      title: row.title,
      quantity: row.quantity,
      price: parseFloat(row.price),
    });
  });

  const orderIds = Object.keys(loadedDatabaseOrders).sort((a, b) => b - a);

  if (orderIds.length === 0) {
    list.innerHTML = `<li class="py-4 text-sm text-neutral-400 italic text-center">No history yet.</li>`;
    return;
  }

  // Render orders pulled dynamically out of your MySQL tables
  orderIds.forEach((id) => {
    const order = loadedDatabaseOrders[id];
    const dateObj = new Date(order.created_at);
    const formattedDate = dateObj.toLocaleDateString();
    const formattedTime = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsSummary = order.items
      .map((item) => `${item.title} (x${item.quantity})`)
      .join(", ");

    list.innerHTML += `
          <li class="p-3 bg-pink-50/30 rounded-xl border border-pink-100/60 flex justify-between items-center cursor-pointer hover:bg-pink-50/70 transition-colors animate-fade-in" onclick="openInvoiceModal('${id}')">
            <div class="max-w-[70%]">
              <span class="font-mono text-pink-600 font-bold">#ORDER_ID_${order.id}</span> 
              <span class="text-[10px] text-neutral-400 ml-1 font-medium">${formattedDate} @ ${formattedTime}</span>
              <p class="text-xs text-neutral-500 truncate mt-0.5">${itemsSummary}</p>
            </div>
            <div class="text-right shrink-0">
              <strong class="text-pink-600 font-semibold text-base block">$${order.total.toFixed(2)}</strong>
              <span class="text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-pink-100 rounded-md font-bold text-pink-700">View Invoice</span>
            </div>
          </li>`;
  });
}

// --- FIXED: DISPLAY LIVE DETAILED INVOICE MODAL FROM DATABASE ---
function openInvoiceModal(orderId) {
  const order = loadedDatabaseOrders[orderId];
  if (!order) return;

  const modal = document.getElementById("invoice-modal");
  const content = document.getElementById("invoice-modal-content");

  let itemsHTML = "";
  let subtotal = 0;

  order.items.forEach((item) => {
    let rowTotal = item.price * item.quantity;
    subtotal += rowTotal;
    itemsHTML += `
          <div class="flex justify-between items-center text-xs py-2 border-b border-neutral-100 text-neutral-600">
            <div class="font-medium max-w-[60%] truncate">${item.title} <span class="text-neutral-400 ml-1">x${item.quantity}</span></div>
            <div class="font-mono font-medium text-neutral-700">$${rowTotal.toFixed(2)}</div>
          </div>`;
  });

  // Recalculate original checkout breakdown structures for display
  const deliveryFee = 1.5;
  let discountApplied = subtotal + deliveryFee - order.total;
  if (discountApplied < 0.01) discountApplied = 0; // Handle precision adjustments

  const dateObj = new Date(order.created_at);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedTime = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  content.innerHTML = `
        <div class="text-center pb-4 border-b border-dashed border-neutral-200 mb-4">
          <img src="./image/logo copy.png" alt="Invoice Logo" class="w-[60px] mx-auto mb-1">
          <h2 class="text-base font-bold uppercase text-neutral-800 tracking-wider">Minee Beauty Invoice</h2>
          <p class="text-[10px] text-neutral-400 font-mono mt-0.5">Database Reference: #LIVE_DB_00${order.id}</p>
          <p class="text-[10px] text-neutral-500 font-medium mt-0.5"><i class="fa-regular fa-calendar-days mr-1"></i>${formattedDate} at ${formattedTime}</p>
        </div>

        <div class="mb-4 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-[11px] space-y-1 text-neutral-600">
          <p class="font-bold text-neutral-700 uppercase text-[9px] tracking-wide text-pink-600 mb-1">Receipt Summary</p>
          <div><span class="text-neutral-400">Order Context:</span> <span class="font-semibold text-neutral-700">Verified Client Invoice</span></div>
          <div><span class="text-neutral-400">Status:</span> <span class="px-1.5 py-0.5 bg-emerald-100 rounded font-bold text-emerald-700 text-[9px]">PAID & RECORDED</span></div>
        </div>

        <p class="font-bold uppercase text-[9px] tracking-wide text-neutral-400 mb-2 px-1">Purchased Items</p>
        <div class="max-h-[160px] overflow-y-auto mb-4 px-1">${itemsHTML}</div>

        <div class="bg-neutral-50/50 rounded-2xl p-3 border border-neutral-100 space-y-1.5 text-xs">
          <div class="flex justify-between text-neutral-500">
            <span>Subtotal:</span>
            <span class="font-mono">$${subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">
            <span class="font-semibold">Welcome Discount Applied:</span>
            <span class="font-mono font-bold">-$${discountApplied.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-neutral-500 border-b border-neutral-100 pb-2">
            <span>Shipping Delivery Fee:</span>
            <span class="font-mono">+$${deliveryFee.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center text-sm font-bold pt-1.5">
            <span class="text-neutral-800">Total Paid:</span>
            <span class="text-pink-600 text-base font-mono">$${order.total.toFixed(2)}</span>
          </div>
        </div>
      `;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeInvoiceModal() {
  document.getElementById("invoice-modal").classList.add("hidden");
  document.body.style.overflow = "auto";
}

function logout() {
  const confirmLogout = confirm("Are you sure you want to log out?");
  if (confirmLogout) {
    localStorage.removeItem("currentUser");
    window.location.href = "contact.html";
  }
}
