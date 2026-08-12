// FIXED: Shifted port to 3000 to cleanly match your Express Server setup
const API_URL = "http://localhost:3000/api";

// FIXED: Maps to "minee_cart" to match the local storage tracker used in product.js
let checkoutCart = JSON.parse(localStorage.getItem("minee_cart")) || [];
let selectedMethod = "Cash on Delivery";

// --- RENDER CHECKOUT PAGE ---
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

  // Use an array to assemble strings cleanly instead of spamming += on innerHTML
  let itemsHTML = "";
  
  // Try to load fresh database rows to match accurate non-discount/discount properties
  let databaseProductsList = [];
  try {
    const res = await fetch(`${API_URL}/products`);
    if (res.ok) databaseProductsList = await res.json();
  } catch (err) {
    console.warn("Could not load raw database product variations for checkout comparison display.");
  }

  checkoutCart.forEach(item => {
    // Look up product row properties in the database to see if it has an original vs discount price setup
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
        // Make sure our running session calculations reflect the correct live database pricing layout row
        item.price = dbDiscount; 
      }
    }

    const rowTotal = finalItemPrice * item.quantity;
    total += rowTotal;

    // Build responsive text nodes separating original vs discounted columns beautifully
    itemsHTML += `
      <div class="flex items-center py-3 px-1 border-b border-neutral-100/60 last:border-0">
        <div class="flex-[2_2_0%] font-medium text-xs truncate max-w-[180px]">
          <p class="text-neutral-800 font-semibold truncate">${item.title}</p>
          ${hasItemDiscount ? `<span class="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">On Sale</span>` : ''}
        </div>
        <div class="flex-1 text-center text-neutral-500 text-xs">x${item.quantity}</div>
        
        <!-- 🔥 SHOW ORIGINAL VS DISCOUNTED PRICES SIDE BY SIDE -->
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

  // DEFAULT TO TRUE: If they are a new guest or server is loading, give them the discount benefit
  let isFirstOrder = true;

  // Ask the Express backend if this user has ordered anything before to calculate discount
  if (userQueryKey !== "Guest") {
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(userQueryKey)}`);
      if (response.ok) {
        const orders = await response.json();
        // If the database returns an array with 1 or more items, it is NOT their first order anymore
        isFirstOrder = (Array.isArray(orders) && orders.length === 0);
      }
    } catch (err) {
      console.warn("Backend connection missed. Defaulting to true for testing first order layout.");
      isFirstOrder = true; // ✅ FIXED: Fallback to true so you can see it work locally!
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
        <span>Total Payable:</span><span class="text-pink-600 text-base font-mono">$${finalTotal.toFixed(2)}</span>
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

// --- PAYMENT METHOD SELECTOR ---
window.selectPayment = function(method) {
  selectedMethod = method;
  document.querySelectorAll(".payment-section").forEach(sec => sec.classList.add("hidden"));
  document.querySelectorAll(".pay-selector-btn").forEach(btn => btn.classList.remove("border-pink-400", "bg-pink-50"));

  if (method === 'Bank QR') {
    document.getElementById("bank-qr").classList.remove("hidden");
    document.getElementById("btn-bank").classList.add("border-pink-400", "bg-pink-50");
  } else if (method === 'Phone Line') {
    document.getElementById("phone-pay").classList.remove("hidden");
    document.getElementById("btn-phone").classList.add("border-pink-400", "bg-pink-50");
  } else {
    document.getElementById("cash-pay").classList.remove("hidden");
    document.getElementById("btn-cash").classList.add("border-pink-400", "bg-pink-50");
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
    alert("⚠️ Checkout saved locally, but database insertion failed. Check if node server is active.");
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