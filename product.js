document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("discountPopup");
  const closeBtn = document.getElementById("closePopup");
  const shopNowBtn = document.getElementById("shopNowBtn");

  if (popup) popup.style.display = "flex";

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      popup.style.display = "none";
    });
  }

  if (shopNowBtn) {
    shopNowBtn.addEventListener("click", function () {
      window.location.href = "product.html";
    });
  }
});

function goToPage(page) {
  if (page) window.location.href = page;
}

/* ================= CART ================= */

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }

  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartButton();
  renderCartPreview();
}

function updateCartButton() {
  const btn = document.getElementById("cart-button");
  if (!btn) return;

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  btn.innerText = `Cart Item (${totalQty})`;
}

function renderCartPreview() {
  const list = document.getElementById("cart-items");
  const totalBox = document.getElementById("cart-total");

  if (!list || !totalBox) return;

  list.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.name}</strong><br>
      $${item.price} x ${item.quantity}
      <button onclick="decrease(${index})">-</button>
      <button onclick="increase(${index})">+</button>
    `;
    list.appendChild(li);
  });

  totalBox.innerText = `Total: $${total.toFixed(2)}`;
}

function increase(i) {
  cart[i].quantity++;
  saveCart();
}

function decrease(i) {
  cart[i].quantity--;

  if (cart[i].quantity <= 0) {
    cart.splice(i, 1);
  }

  saveCart();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  const cartButton = document.getElementById("cart-button");
  const preview = document.getElementById("cart-preview");

  if (cartButton && preview) {
    cartButton.onclick = () => {
      preview.style.display =
        preview.style.display === "block" ? "none" : "block";
    };
  }

  updateCartButton();
  renderCartPreview();
});

/* ================= CHECKOUT (FIXED FLOW) ================= */

function confirmCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (!cart.length) {
    alert("Cart is empty!");
    return;
  }

  window.location.href = "checkout.html";
}