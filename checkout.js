const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "https://minee-beauty-store.onrender.com/api";

let checkoutCart = JSON.parse(localStorage.getItem("minee_cart")) || [];
let selectedMethod = "Cash on Delivery";
let currentKHQRAttempt = null;
let khqrExpirationTimer = null;
let khqrGenerationRunning = false;
let khqrVerificationRunning = false;
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

if (method === "Bank QR") {
  document
    .getElementById("bank-qr")
    .classList.remove("hidden");

  document
    .getElementById("btn-bank")
    .classList.add(
      "border-pink-400",
      "bg-pink-50"
    );

  const attemptIsActive =
    currentKHQRAttempt &&
    Date.now() <
      new Date(
        currentKHQRAttempt.expiresAt
      ).getTime();

  if (!attemptIsActive) {
    generateKHQRPayment();
  }
  } else if (method === 'Phone Line') {
    document.getElementById("phone-pay").classList.remove("hidden");
    document.getElementById("btn-phone").classList.add("border-pink-400", "bg-pink-50");
  } else {
    document.getElementById("cash-pay").classList.remove("hidden");
    document.getElementById("btn-cash").classList.add("border-pink-400", "bg-pink-50");
  }
}
function getCheckoutCustomerDetails() {
  let user =
    JSON.parse(
      localStorage.getItem("currentUser")
    );

  if (!user) {
    user = {
      name: "Guest Customer",
      phone: "",
      address: ""
    };
  }

  let phone =
    String(user.phone || "").trim();

  let address =
    String(user.address || "").trim();

  const addressForm =
    document.getElementById("address-form");

  if (
    addressForm &&
    !addressForm.classList.contains("hidden")
  ) {
    phone =
      document
        .getElementById("input-phone")
        .value
        .trim();

    address =
      document
        .getElementById("input-address")
        .value
        .trim();
  }

  if (
    !phone ||
    !address ||
    phone === "No phone added" ||
    address === "No address saved" ||
    address === "No address assigned"
  ) {
    throw new Error(
      "Enter your phone number and delivery address before generating KHQR."
    );
  }

  return {
    customerName:
      String(
        user.name || "Guest Customer"
      ).trim(),
    phone,
    address
  };
}

function setKHQRView(view) {
  const loading =
    document.getElementById("khqr-loading");

  const content =
    document.getElementById("khqr-content");

  const error =
    document.getElementById("khqr-error");

  loading.classList.toggle(
    "hidden",
    view !== "loading"
  );

  content.classList.toggle(
    "hidden",
    view !== "content"
  );

  error.classList.toggle(
    "hidden",
    view !== "error"
  );
}

function showKHQRError(message) {
  document
    .getElementById("khqr-error-message")
    .innerText = message;

  setKHQRView("error");
}

function startKHQRExpirationTimer(
  expiresAt
) {
  if (khqrExpirationTimer) {
    clearInterval(khqrExpirationTimer);
  }

  const expirationElement =
    document.getElementById(
      "khqr-expiration"
    );

  const verifyButton =
    document.getElementById(
      "verify-khqr-button"
    );

  const updateTimer = () => {
    const remainingMilliseconds =
      new Date(expiresAt).getTime() -
      Date.now();

    if (remainingMilliseconds <= 0) {
      clearInterval(
        khqrExpirationTimer
      );

      khqrExpirationTimer = null;
      currentKHQRAttempt = null;

      expirationElement.innerText =
        "KHQR expired";

      verifyButton.disabled = true;

      showKHQRError(
        "This KHQR has expired. Generate a new payment QR."
      );

      return;
    }

    const totalSeconds =
      Math.ceil(
        remainingMilliseconds / 1000
      );

    const minutes =
      Math.floor(totalSeconds / 60);

    const seconds =
      totalSeconds % 60;

    expirationElement.innerText =
      `Expires in ${minutes}:` +
      String(seconds).padStart(2, "0");
  };

  updateTimer();

  khqrExpirationTimer =
    setInterval(updateTimer, 1000);
}

window.generateKHQRPayment =
  async function () {
    if (khqrGenerationRunning) {
      return;
    }

    if (!checkoutCart.length) {
      showKHQRError(
        "Your cart is empty."
      );

      return;
    }

    let customer;

    try {
      customer =
        getCheckoutCustomerDetails();
    } catch (error) {
      showKHQRError(error.message);
      return;
    }

    khqrGenerationRunning = true;
    currentKHQRAttempt = null;

    setKHQRView("loading");

    try {
      const response =
        await fetch(
          `${API_URL}/payments/khqr`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              customer_name:
                customer.customerName,
              phone: customer.phone,
              address: customer.address,
              cart:
                checkoutCart.map(
                  item => ({
                    id:
                      Number(item.id),
                    quantity:
                      Number(
                        item.quantity
                      )
                  })
                )
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "Unable to generate KHQR."
        );
      }

      currentKHQRAttempt = {
        id:
          data.paymentAttemptId,
        reference:
          data.paymentReference,
        amount:
          Number(data.amount),
        expiresAt:
          data.expiresAt,
        customerName:
          customer.customerName
      };

      document
        .getElementById("khqr-image")
        .src = data.qrImage;

      document
        .getElementById("khqr-amount")
        .innerText =
          `$${Number(data.amount).toFixed(2)} USD`;

      document
        .getElementById("khqr-status")
        .innerText =
          "Complete the transfer, then press Verify Payment.";

      const verifyButton =
        document.getElementById(
          "verify-khqr-button"
        );

      verifyButton.disabled = false;

      setKHQRView("content");

      startKHQRExpirationTimer(
        data.expiresAt
      );
    } catch (error) {
      console.error(
        "KHQR generation error:",
        error
      );

      showKHQRError(
        error.message ||
        "Unable to generate KHQR."
      );
    } finally {
      khqrGenerationRunning = false;
    }
  };
function completeVerifiedKHQROrder(
  data
) {
  const history =
    JSON.parse(
      localStorage.getItem(
        "orderHistory"
      )
    ) || [];

  history.push({
    orderId: data.orderId,

    customerName:
      currentKHQRAttempt
        .customerName,

    totalPrice:
      currentKHQRAttempt
        .amount
        .toFixed(2),

    date:
      new Date()
        .toLocaleDateString(),

    time:
      new Date()
        .toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ),

    items: checkoutCart,
    method: "Bank QR"
  });

  localStorage.setItem(
    "orderHistory",
    JSON.stringify(history)
  );

  localStorage.removeItem(
    "minee_cart"
  );

  if (khqrExpirationTimer) {
    clearInterval(
      khqrExpirationTimer
    );
  }

  window.location.href =
    "order-success.html";
}

function beginVerificationCooldown(
  seconds
) {
  const button =
    document.getElementById(
      "verify-khqr-button"
    );

  let remaining =
    Math.max(
      1,
      Number(seconds) || 60
    );

  let timer = null;

  button.disabled = true;

  const updateButton = () => {
    button.innerText =
      `Try Again in ${remaining}s`;

    remaining -= 1;

    if (remaining < 0) {
      clearInterval(timer);

      button.disabled = false;

      button.innerHTML =
        '<i class="fa-solid fa-circle-check mr-1"></i> Verify Payment';
    }
  };

  updateButton();

  timer =
    setInterval(
      updateButton,
      1000
    );
}

window.verifyKHQRPayment =
  async function () {
    if (
      khqrVerificationRunning ||
      !currentKHQRAttempt
    ) {
      return;
    }

    const expiresAt =
      new Date(
        currentKHQRAttempt.expiresAt
      ).getTime();

    if (Date.now() >= expiresAt) {
      showKHQRError(
        "This KHQR has expired. Generate a new payment QR."
      );

      return;
    }

    const button =
      document.getElementById(
        "verify-khqr-button"
      );

    const status =
      document.getElementById(
        "khqr-status"
      );

    khqrVerificationRunning = true;
    button.disabled = true;

    button.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Checking Payment...';

    status.className =
      "mt-3 text-xs text-blue-600";

    status.innerText =
      "Checking your transaction with Bakong...";

    try {
      const response =
        await fetch(
          `${API_URL}/payments/khqr/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                paymentAttemptId:
                  currentKHQRAttempt.id
              })
          }
        );

      const data =
        await response.json();

      if (data.verified) {
        status.className =
          "mt-3 text-xs font-semibold text-emerald-600";

        status.innerText =
          "Payment verified successfully.";

        button.innerHTML =
          '<i class="fa-solid fa-check mr-1"></i> Payment Verified';

        completeVerifiedKHQROrder(
          data
        );

        return;
      }

      if (response.status === 429) {
        status.className =
          "mt-3 text-xs text-amber-600";

        status.innerText =
          data.message;

        beginVerificationCooldown(
          data.retryAfter || 60
        );

        return;
      }

      if (data.expired) {
        currentKHQRAttempt = null;

        showKHQRError(
          data.message
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Payment verification failed."
        );
      }

      status.className =
        "mt-3 text-xs text-amber-600";

      status.innerText =
        data.message;

      beginVerificationCooldown(60);
    } catch (error) {
      console.error(
        "KHQR verification error:",
        error
      );

      status.className =
        "mt-3 text-xs text-red-600";

      status.innerText =
        error.message ||
        "Unable to verify payment.";

      button.disabled = false;

      button.innerHTML =
        '<i class="fa-solid fa-circle-check mr-1"></i> Verify Payment';
    } finally {
      khqrVerificationRunning = false;
    }
  };
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

  let completedOrderData = null;

  try {
    const response = await fetch(
      `${API_URL}/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data =
      await response.json().catch(() => ({
        message:
          "The server returned an invalid response."
      }));

    if (!response.ok) {
      throw new Error(
        data.message ||
        "The order could not be completed."
      );
    }

    completedOrderData = data;

    console.log(
      `Order processed successfully. Backend reference ID: #${data.orderId}`
    );
  } catch (error) {
    console.error(
      "Checkout failed:",
      error
    );

    alert(
      error.message ||
      "Checkout failed. Please try again."
    );

    return;
  }

  const orderHistory =
    JSON.parse(
      localStorage.getItem(
        "orderHistory"
      )
    ) || [];

  orderHistory.push({
    orderId:
      completedOrderData.orderId,

    customerName:
      user.name ||
      "Guest Customer",

    totalPrice:
      Number(
        completedOrderData.total
      ).toFixed(2),

    date:
      new Date().toLocaleDateString(),

    time:
      new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      ),

    items: checkoutCart,

    method: selectedMethod
  });

  localStorage.setItem(
    "orderHistory",
    JSON.stringify(orderHistory)
  );

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