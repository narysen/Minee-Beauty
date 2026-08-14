// Dynamic API Base URL supporting local testing and Render production deployment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://minee-beauty-store.onrender.com/api';

let checkoutCart = JSON.parse(localStorage.getItem("minee_cart")) || [];
let selectedMethod = "Cash on Delivery";
let currentBakongMd5 = null;
let bakongTimerInterval = null;

async function renderCheckoutPage() {
  const cartItemsContainer = document.getElementById("checkout-cart-items");
  const cartTotalContainer = document.getElementById("checkout-cart-total");
  if (!cartItemsContainer || !cartTotalContainer) return;
  
  cartItemsContainer.innerHTML = "";
  let total = 0;

  if (checkoutCart.length === 0) {
    cartItemsContainer.innerHTML = `<div class='text-center py-4 text-neutral-400 text-xs'>Your cart is empty.</div>`;
    return;
  }

  let itemsHTML = "";
  
  let databaseProductsList = [];
  try {
    const res = await fetch(`${API_URL}/products`);
    if (res.ok) databaseProductsList = await res.json();
  } catch (err) {
    console.warn("Could not load raw database product variations for checkout comparison display.");
  }

  checkoutCart.forEach(item => {
    const dbMatch = databaseProductsList.find(p => String(p.id) === String(item.id));
    
    let originalPrice = Number(item.price);
    let finalItemPrice = Number(item.price);
    let hasItemDiscount = false;

    if (dbMatch) {
      const dbPrice = Number(dbMatch.price);
      const dbDiscount = dbMatch.discount_price ? Number(dbMatch.discount_price) : null;
      
      if (dbDiscount && dbDiscount < dbPrice) {
        originalPrice = dbPrice;
        finalItemPrice = dbDiscount;
        hasItemDiscount = true;
        item.price = dbDiscount; 
      }
    }

    const rowTotal = finalItemPrice * item.quantity;
    total += rowTotal;

    itemsHTML += `
      <div class="flex items-center py-3 px-1 border-b border-neutral-100/60 last:border-0">
        <div class="flex-[2_2_0%] font-medium text-xs truncate max-w-[180px]">
          <p class="text-neutral-800 font-semibold truncate">${item.title}</p>
          ${hasItemDiscount ? `<span class="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">On Sale</span>` : ''}
        </div>
        <div class="flex-1 text-center text-neutral-500 text-xs">x${item.quantity}</div>
        
        <div class="flex-[1.5_1.5_0%] text-right text-xs">
          ${hasItemDiscount ? `
            <span class="text-neutral-400 line-through block text-[10px]">$${originalPrice.toFixed(2)}</span>
            <span class="text-pink-600 font-bold block">$${finalItemPrice.toFixed(2)}</span>
          ` : `
            <span class="text-neutral-600 font-medium">$${finalItemPrice.toFixed(2)}</span>
          `}
        </div>
        
        <div class="flex-1 text-right font-black text-neutral-800 text-xs font-mono">$${rowTotal.toFixed(2)}</div>
      </div>`;
  });
  cartItemsContainer.innerHTML = itemsHTML;

  // Pull current logged-in customer profile state properties
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const userQueryKey = user && user.name ? user.name : "Guest";

  let isFirstOrder = true;

  if (userQueryKey !== "Guest") {
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(userQueryKey)}`);
      if (response.ok) {
        const orders = await response.json();
        isFirstOrder = (Array.isArray(orders) && orders.length === 0);
      }
    } catch (err) {
      console.warn("Backend connection missed. Defaulting to true for testing first order layout.");
      isFirstOrder = true; 
    }
  }

  let discount = isFirstOrder ? total * 0.05 : 0;
  const deliveryFee = 1.50;
  let finalTotal = total - discount + deliveryFee;

  cartTotalContainer.innerHTML = `
    <div class="space-y-1.5 text-xs">
      <div class="flex justify-between text-neutral-600"><span>Subtotal:</span><span class="font-mono font-medium">$${total.toFixed(2)}</span></div>
      
      <div class="flex justify-between items-center p-2 rounded-xl transition-all ${isFirstOrder ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60' : 'text-neutral-400 bg-neutral-100/50'}">
        <span>First Order Discount (5%):</span>
        <span class="font-mono">${isFirstOrder ? `-$${discount.toFixed(2)}` : '$0.00'}</span>
      </div>
      
      <div class="flex justify-between text-neutral-600 border-b border-neutral-100 pb-2"><span>Delivery Shipping Fee:</span><span class="font-medium text-neutral-700 font-mono">+$${deliveryFee.toFixed(2)}</span></div>
      <div class="flex justify-between items-center text-sm font-bold pt-2">
        <span>Total Payable:</span><span id="final-payable-amount" class="text-pink-600 text-base font-mono" data-total="${finalTotal.toFixed(2)}">$${finalTotal.toFixed(2)}</span>
      </div>
    </div>`;
}

// --- ADDRESS MANAGEMENT UI ---
function setupAddressUI() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) return;

  if (user.phone && user.address && user.address !== "No address saved" && user.address !== "No address assigned") {
    document.getElementById("address-form").classList.add("hidden");
    document.getElementById("address-summary").classList.remove("hidden");
    
    document.getElementById("info-name").innerText = user.name || "N/A";
    document.getElementById("info-phone").innerText = user.phone;
    document.getElementById("info-address").innerText = user.address;
  } else {
    document.getElementById("address-form").classList.remove("hidden");
    document.getElementById("address-summary").classList.add("hidden");
  }
}

window.changeShippingInfo = function() {
  const user = JSON.parse(localStorage.getItem("currentUser")) || {};
  document.getElementById("input-phone").value = user.phone || "";
  document.getElementById("input-address").value = 
    (user.address === "No address saved" || user.address === "No address assigned") ? "" : (user.address || "");
  
  document.getElementById("address-form").classList.remove("hidden");
  document.getElementById("address-summary").classList.add("hidden");
}

// --- BAKONG KHQR GENERATION & TIMER ---
async function loadBakongQR() {
  const totalElem = document.getElementById("final-payable-amount");
  const amount = totalElem ? parseFloat(totalElem.getAttribute("data-total")) : 9.39;

  const qrBox = document.getElementById('qr-code-box');
  if (!qrBox) return;

  qrBox.innerHTML = `<div class="w-40 h-40 flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs animate-pulse rounded">Generating KHQR...</div>`;

  try {
    const response = await fetch(`${API_URL}/bakong/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount, currency: 'USD', description: 'Minee Beauty Store Order' })
    });

    const result = await response.json();

    if (result.success && result.data) {
      currentBakongMd5 = result.data.md5 || result.data.data?.md5;
      const qrString = result.data.qrString || result.data.data?.qr;
      
      const qrImageSrc = qrString 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrString)}`
        : (result.data.qrImage || './image/payment/qr1.jpg');

      qrBox.innerHTML = `<img src="${qrImageSrc}" alt="Bakong KHQR" class="w-40 h-40 object-contain rounded-lg">`;
      startBakongTimer(600); // 10 minutes countdown
    } else {
      qrBox.innerHTML = `<p class="text-xs text-red-500 p-4">Failed to generate QR. Click Complete Manually.</p>`;
    }
  } catch (error) {
    console.error('Bakong QR generation error:', error);
    qrBox.innerHTML = `<p class="text-xs text-red-500 p-4">Network error connecting to Bakong.</p>`;
  }
}

function startBakongTimer(durationSeconds) {
  if (bakongTimerInterval) clearInterval(bakongTimerInterval);
  let timer = durationSeconds;
  const timerDisplay = document.getElementById('bakong-timer');
  if (!timerDisplay) return;

  bakongTimerInterval = setInterval(() => {
    let minutes = parseInt(timer / 60, 10);
    let seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    timerDisplay.textContent = `QR Expires in: ${minutes}:${seconds}`;

    if (--timer < 0) {
      clearInterval(bakongTimerInterval);
      timerDisplay.textContent = "QR Expired. Please refresh.";
    }
  }, 1000);
}

window.checkBakongPaymentStatus = async function() {
  if (!currentBakongMd5) {
    alert("No active transaction code found. Please re-select Bakong KHQR.");
    return;
  }

  const verifyBtn = document.getElementById("verify-payment-btn");
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerText = "Verifying...";
  }

  try {
    const res = await fetch(`${API_URL}/bakong/check-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ md5: currentBakongMd5 })
    });

    const result = await res.json();
    if (result.success && result.data) {
      alert("Payment verified successfully via Bakong!");
      window.finishAssumedOrder();
    } else {
      alert("Payment not detected yet. Please ensure payment is completed in your banking app.");
    }
  } catch (err) {
    console.error("Verification check failed:", err);
    alert("Unable to verify payment status automatically at this moment.");
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerText = "Verify Payment Status";
    }
  }
}

// --- PAYMENT METHOD SELECTOR ---
window.selectPayment = function(method) {
  selectedMethod = method;
  document.querySelectorAll(".payment-section").forEach(sec => sec.classList.add("hidden"));
  document.querySelectorAll(".pay-selector-btn").forEach(btn => btn.classList.remove("border-pink-400", "bg-pink-50"));

  if (method === 'Bank QR') {
    document.getElementById("bank-qr").classList.remove("hidden");
    document.getElementById("btn-bank").classList.add("border-pink-400", "bg-pink-50");
    loadBakongQR();
  } else if (method === 'Phone Line') {
    document.getElementById("phone-pay").classList.remove("hidden");
    document.getElementById("btn-phone").classList.add("border-pink-400", "bg-pink-50");
    if (bakongTimerInterval) clearInterval(bakongTimerInterval);
  } else {
    document.getElementById("cash-pay").classList.remove("hidden");
    document.getElementById("btn-cash").classList.add("border-pink-400", "bg-pink-50");
    if (bakongTimerInterval) clearInterval(bakongTimerInterval);
  }
}

// --- SUBMIT ORDER & REDIRECT ---
window.finishAssumedOrder = async function() {
  if (!checkoutCart.length) return alert("Cart is empty!");
  
  let user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    user = { name: "Guest Customer", phone: "", address: "" };
  }

  let phoneVal = "";
  let addressVal = "";

  if (!document.getElementById("address-form").classList.contains("hidden")) {
    phoneVal = document.getElementById("input-phone").value.trim();
    addressVal = document.getElementById("input-address").value.trim();

    if (!phoneVal || !addressVal) {
      alert("Please input your Phone Number and Delivery Address before checking out!");
      return;
    }

    user.phone = phoneVal;
    user.address = addressVal;
    localStorage.setItem("currentUser", JSON.stringify(user));
  } else {
    phoneVal = user.phone;
    addressVal = user.address;
  }

  const payload = {
    customer_name: user.name,
    phone: phoneVal,
    address: addressVal,
    cart: checkoutCart.map(item => ({
      id: Number(item.id),
      price: Number(item.price),
      quantity: Number(item.quantity)
    })),
    payment_method: selectedMethod
  };

  try {
    const response = await fetch(`${API_URL}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error("Server checkout pipeline rejected request.");
    const data = await response.json();
    console.log(`Order processed successfully backend reference ID: #${data.orderId}`);
    
  } catch (err) {
    console.error("Express registration sequence error details:", err);
    alert("Checkout saved locally, but database insertion failed. Check if node server is active.");
  }

  // SHOWS HISTORY ON PROFILE INFO: Saves order records with exact time
  let orderHistory = JSON.parse(localStorage.getItem("orderHistory")) || [];
  orderHistory.push({
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
    items: checkoutCart,
    method: selectedMethod
  });
  localStorage.setItem("orderHistory", JSON.stringify(orderHistory));

  // Clear the local storage basket memory out completely
  localStorage.removeItem("minee_cart");
  
  // Routes directly to your beautiful Order Confirmation layout instead of user profile
  window.location.href = "order-success.html";
}

document.addEventListener("DOMContentLoaded", () => { 
  renderCheckoutPage(); 
  setupAddressUI();
  selectPayment('Cash on Delivery'); 
});