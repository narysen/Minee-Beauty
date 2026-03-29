document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("discountPopup");
  const closeBtn = document.getElementById("closePopup");
  const shopNowBtn = document.getElementById("shopNowBtn");

  // Show popup when page loads
  if (popup) {
    popup.style.display = "flex";
  }

  // Close popup
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      popup.style.display = "none";
    });
  }

  // Shop now button
  if (shopNowBtn) {
    shopNowBtn.addEventListener("click", function () {
      window.location.href = "product.html";
    });
  }
});


function goToPage(page) {
  if (page) {
    window.location.href = page;
  }
}

let cart = JSON.parse(localStorage.getItem("cart")) ||  [];
//cart

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

//checkout
document.addEventListener("DOMContentLoaded", () => {
  const cartButton = document.getElementById("cart-button");
  const preview = document.getElementById("cart-preview");

  // Load cart safely from localStorage
  let cart = JSON.parse(localStorage.getItem("cart")) ||  [];

  // Toggle cart preview
  if (cartButton && preview) {
    cartButton.onclick = () => {
      preview.style.display =
        preview.style.display === "block" ? "none" : "block";
    };
  }

  // Save cart globally so confirmCart can use it
  window.cart = cart;

  updateCartButton();
  renderCartPreview();
});



function confirmCart() {
  const user = JSON.parse(localStorage.getItem("user"));
  const cart = JSON.parse(localStorage.getItem("cart")) ||  [];

  if (!cart.length) {
    alert("Cart is empty!");
    return;
  }

 fetch("https://minee-beauty.onrender.com/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer_name: user.name,
      address: user.address || "No address",
      cart: cart
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("SERVER RESPONSE:", data);

    alert("Order placed successfully!");

    // clear cart after order
    localStorage.removeItem("cart");

    // go to profile / history
    window.location.href = "profileinfo.html";
  })
  .catch(err => {
    console.error("CHECKOUT ERROR:", err);
  });
} 