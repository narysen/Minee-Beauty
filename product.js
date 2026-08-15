let productsDatabase = [];
let cart = [];

const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "https://minee-beauty-store.onrender.com/api";

// Example usage:
fetch(`${API_URL}/products`)
  .then((res) => res.json())
  .then((data) => console.log(data));

// Fetch live items directly out of your local or production database instance
async function fetchProductsFromDatabase() {
  try {
    const response = await fetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Unable to load live product inventory.");
    }

    productsDatabase = await response.json();

    productsDatabase.forEach((product) => {
      const card = document.querySelector(`[data-id="${product.id}"]`);

      if (!card) return;

      const stockQuantity = Number(product.stock) || 0;

      // Keep the exact database stock, including zero.
      card.setAttribute("data-stock", String(stockQuantity));

      if (stockQuantity > 0) {
        return;
      }

      // Disable only purchasing.
      const addButton = card.querySelector('button[onclick^="addToCart"]');

      if (addButton) {
        addButton.disabled = true;
        addButton.removeAttribute("onclick");
        addButton.innerText = "Sold Out";

        addButton.className =
          "w-full bg-neutral-200 text-neutral-400 text-sm font-semibold py-2 px-4 rounded-xl cursor-not-allowed mt-auto";
      }

      // The overlay does not block clicking the product details.
      const detailArea = card.querySelector('[onclick^="viewProduct"]');

      if (detailArea && !detailArea.querySelector(".sold-out-overlay")) {
        detailArea.classList.add("relative", "mb-3");

        detailArea.insertAdjacentHTML(
          "beforeend",
          `
            <div class="sold-out-overlay pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900/25 rounded-xl">
              <span class="bg-white/95 text-neutral-800 text-xs font-black px-4 py-2 rounded-lg shadow-sm border uppercase tracking-wide">
                Sold Out
              </span>
            </div>
          `,
        );
      }
    });

    const user = JSON.parse(localStorage.getItem("currentUser"));

    const userQueryKey = user && user.name ? user.name : "Guest";

    let isFirstOrder = true;

    try {
      const orderResponse = await fetch(
        `${API_URL}/orders/${encodeURIComponent(userQueryKey)}`,
      );

      const orders = await orderResponse.json();

      isFirstOrder = Array.isArray(orders) && orders.length === 0;
    } catch (error) {
      isFirstOrder = true;
    }

    window.userQualifiesForDiscount = isFirstOrder;

    updateCartUIDraw();
    syncWishlistUI();
  } catch (error) {
    console.error("Unable to synchronize collection stock:", error);

    if (typeof updateCartUIDraw === "function") {
      updateCartUIDraw();
    }

    if (typeof syncWishlistUI === "function") {
      syncWishlistUI();
    }
  }
}

window.renderProducts = function (filteredResults) {
  const container = document.getElementById("product-container");
  if (!container) return;

  if (!filteredResults || filteredResults.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center text-neutral-500 py-8">No products found</p>`;
    return;
  }

  const now = new Date();

  container.innerHTML = filteredResults
    .map((prod) => {
      // Escape strings safely
      const escapedTitle = (prod.title || prod.name || "Skincare Item").replace(
        /'/g,
        "\\'",
      );
      const escapedCategory = (
        prod.category ||
        prod.type ||
        "Essential"
      ).replace(/'/g, "\\'");
      const escapedImg = (
        prod.image_url ||
        prod.image ||
        prod.img ||
        "./image/logo copy.png"
      ).replace(/'/g, "\\'");
      const escapedIngredients = (prod.ingredients || "").replace(/'/g, "\\'");

      const standardPrice = parseFloat(prod.price || 0);

      // Check if promotional discount is active
      let hasActiveDiscount = false;
      let finalPrice = standardPrice;

      if (
        prod.discount_price !== null &&
        prod.discount_price !== undefined &&
        parseFloat(prod.discount_price) > 0
      ) {
        const start = prod.discount_start
          ? new Date(prod.discount_start)
          : null;
        const end = prod.discount_end ? new Date(prod.discount_end) : null;

        const isAfterStart = !start || now >= start;
        const isBeforeEnd = !end || now <= end;

        if (isAfterStart && isBeforeEnd) {
          hasActiveDiscount = true;
          finalPrice = parseFloat(prod.discount_price);
        }
      }

      const formattedPrice = finalPrice.toFixed(2);
      const formattedStandardPrice = standardPrice.toFixed(2);
      const stockQuantity = prod.stock !== undefined ? Number(prod.stock) : 0;

      const isOutOfStock = stockQuantity <= 0;

      const userLimit =
        prod.limit_per_user !== undefined ? Number(prod.limit_per_user) : 0;

      const soldOutOverlay = isOutOfStock
        ? `
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900/25 rounded-xl z-10">
            <span class="bg-white/95 text-neutral-800 text-xs font-black px-4 py-2 rounded-lg shadow-sm border uppercase tracking-wide">
              Sold Out
            </span>
          </div>
        `
        : "";

      const actionButton = isOutOfStock
        ? `
          <button
            disabled
            class="w-full mt-4 bg-neutral-200 text-neutral-400 text-xs font-semibold py-2.5 rounded-xl cursor-not-allowed text-center block"
          >
            Sold Out
          </button>
        `
        : `
          <button
            onclick="addToCart('${prod.id}')"
            class="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center block"
          >
            Add to Cart
          </button>
        `;
      // Build Price HTML displaying both original price crossed out and discounted price
      let priceHtml = `<div class="text-pink-600 font-extrabold mt-2">$${formattedPrice}</div>`;

      if (hasActiveDiscount) {
        priceHtml = `
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-neutral-400 line-through">$${formattedStandardPrice}</span>
          <span class="text-pink-600 font-extrabold">$${formattedPrice}</span>
          <span class="bg-pink-100 text-pink-600 text-[9px] font-bold px-1.5 py-0.5 rounded">SALE</span>
        </div>
      `;
      } else {
        priceHtml = `<div class="text-pink-600 font-extrabold mt-2">$${formattedStandardPrice}</div>`;
      }

      return `
      <div
        class="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm flex flex-col justify-between relative"
        data-id="${prod.id}"
        data-limit="${userLimit}"
        data-stock="${stockQuantity}"
      >
        <!-- Image remains clickable for product details. -->
        <div
          onclick="viewProductDetail('${prod.id}', \`${escapedTitle}\`, \`${escapedCategory}\`, '$${formattedPrice}', '${escapedImg}', \`${escapedIngredients}\`)"
          class="bg-neutral-50 rounded-xl p-4 flex justify-center items-center h-48 mb-4 cursor-pointer overflow-hidden group relative"
        >
          ${
            hasActiveDiscount
              ? '<span class="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded z-20">SALE</span>'
              : ""
          }

          <img
            src="${escapedImg}"
            alt="${escapedTitle}"
            class="max-h-40 object-contain group-hover:scale-105 transition-transform duration-300"
          >

          ${soldOutOverlay}
        </div>

        <div class="text-left flex-grow">
          <h3
            class="font-bold text-neutral-800 text-sm mt-1 cursor-pointer hover:text-pink-500 transition-colors"
            onclick="viewProductDetail('${prod.id}', \`${escapedTitle}\`, \`${escapedCategory}\`, '$${formattedPrice}', '${escapedImg}', \`${escapedIngredients}\`)"
          >
            ${prod.title || prod.name}
          </h3>

          ${priceHtml}
        </div>

        ${actionButton}
      </div>
    `;
    })
    .join("");
};

function showPanel(panelElement) {
  if (!panelElement) return;
  panelElement.classList.remove(
    "opacity-0",
    "scale-95",
    "pointer-events-none",
    "hidden",
  );
  panelElement.classList.add("opacity-100", "scale-100");
}

function hidePanel(panelElement) {
  if (!panelElement) return;
  panelElement.classList.remove("opacity-100", "scale-100");
  panelElement.classList.add("opacity-0", "scale-95", "pointer-events-none");
}

async function addProductToCart(productId) {
  const currentUser =
    localStorage.getItem("currentUser") ||
    localStorage.getItem("minee_user") ||
    localStorage.getItem("isRegistered");

  if (!currentUser) {
    alert("Please register or log in first before adding items to your cart!");

    window.location.href = "profileinfo.html";

    return;
  }

  const lookupId = String(productId);

  try {
    // Check the database again at click time.
    const response = await fetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Unable to verify inventory.");
    }

    const liveProducts = await response.json();

    const product = liveProducts.find((item) => String(item.id) === lookupId);

    if (!product) {
      alert("This product is no longer available.");
      return;
    }

    productsDatabase = liveProducts;

    // Refresh cart in case another page changed it.
    cart = JSON.parse(localStorage.getItem("minee_cart")) || [];

    const availableStock = Number(product.stock) || 0;

    const existingItem = cart.find((item) => String(item.id) === lookupId);

    const currentQuantity = existingItem
      ? Number(existingItem.quantity) || 0
      : 0;

    if (availableStock <= 0) {
      alert(`Sorry, "${product.title}" is out of stock.`);
      return;
    }

    if (currentQuantity >= availableStock) {
      alert(
        `Sorry, only ${availableStock} unit(s) of "${product.title}" are available.`,
      );
      return;
    }

    const userPurchaseLimit = Number(product.limit_per_user) || 0;

    if (userPurchaseLimit > 0 && currentQuantity >= userPurchaseLimit) {
      alert(
        `Sorry, "${product.title}" is limited to ${userPurchaseLimit} unit(s) per customer.`,
      );
      return;
    }

    let finalPrice = Number(product.price);

    const discountPrice = Number(product.discount_price);

    if (
      Number.isFinite(discountPrice) &&
      discountPrice > 0 &&
      discountPrice < finalPrice
    ) {
      if (product.discount_start && product.discount_end) {
        const now = new Date();

        const startTime = new Date(product.discount_start);

        const endTime = new Date(product.discount_end);

        if (now >= startTime && now <= endTime) {
          finalPrice = discountPrice;
        }
      } else if (!product.discount_start) {
        finalPrice = discountPrice;
      }
    }

    const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);

    const displayedImage = itemContainer?.querySelector("img")?.src;

    const finalImage =
      displayedImage || product.image_url || "./image/logo copy.png";

    if (existingItem) {
      existingItem.quantity = currentQuantity + 1;

      // Refresh stale cart information.
      existingItem.title = product.title;

      existingItem.price = finalPrice;

      existingItem.image = finalImage;

      existingItem.limit_per_user = userPurchaseLimit;
    } else {
      cart.push({
        id: lookupId,
        product_id: lookupId,
        title: product.title,
        price: finalPrice,
        image: finalImage,
        quantity: 1,
        limit_per_user: userPurchaseLimit,
      });
    }

    localStorage.setItem("minee_cart", JSON.stringify(cart));

    if (typeof updateCartUIDraw === "function") {
      updateCartUIDraw();
    }
  } catch (error) {
    console.error("Live Add to Cart stock check failed:", error);

    alert("We could not verify the available stock. Please try again.");
  }
}

window.addToCart = function (id) {
  addProductToCart(String(id));
};

window.removeProductFromCart = function (productId) {
  cart = cart.filter((item) => String(item.id) !== String(productId));
  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

window.increaseQuantity = function (productId) {
  const lookupId = String(productId);
  const existingItem = cart.find((item) => String(item.id) === lookupId);

  if (!existingItem) return;

  let product =
    typeof productsDatabase !== "undefined" && productsDatabase
      ? productsDatabase.find((p) => String(p.id) === lookupId)
      : null;
  const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);

  const maxStock =
    product?.stock !== undefined
      ? parseInt(product.stock)
      : itemContainer?.getAttribute("data-stock")
        ? parseInt(itemContainer.getAttribute("data-stock"))
        : 3;

  const userPurchaseLimit =
    product?.limit_per_user !== undefined
      ? parseInt(product.limit_per_user)
      : itemContainer?.getAttribute("data-limit")
        ? parseInt(itemContainer.getAttribute("data-limit"))
        : 0;

  if (userPurchaseLimit > 0 && existingItem.quantity >= userPurchaseLimit) {
    alert(
      `Restriction Notice: Maximum purchase limit for this item is ${userPurchaseLimit}.`,
    );
    return;
  }

  if (existingItem.quantity >= maxStock) {
    alert(
      `Sorry! Only ${maxStock} items available in our total inventory right now.`,
    );
    return;
  }

  existingItem.quantity += 1;
  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

window.decreaseQuantity = function (productId) {
  const lookupId = String(productId);
  const existingItem = cart.find((item) => String(item.id) === lookupId);

  if (!existingItem) return;

  if (existingItem.quantity > 1) {
    existingItem.quantity -= 1;
  } else {
    cart = cart.filter((item) => String(item.id) !== lookupId);
  }

  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

window.toggleWishlist = function () {
  const wishlistPanel = document.getElementById("wishlist-preview");
  const cartPanel = document.getElementById("cart-preview");
  if (!wishlistPanel) return;

  if (
    wishlistPanel.classList.contains("opacity-0") ||
    wishlistPanel.classList.contains("hidden")
  ) {
    if (cartPanel) hidePanel(cartPanel);
    showPanel(wishlistPanel);
  } else {
    hidePanel(wishlistPanel);
  }
};

window.toggleWishlistItem = function (id, name, price, img) {
  let storeWishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const index = storeWishlist.findIndex(
    (item) => String(item.id) === String(id),
  );

  if (index > -1) {
    storeWishlist.splice(index, 1);
  } else {
    if (!name) {
      const dbProduct = productsDatabase.find(
        (p) => String(p.id) === String(id),
      );
      if (dbProduct) {
        name = dbProduct.title;
        price = dbProduct.discount_price
          ? dbProduct.discount_price
          : dbProduct.price;
        img = dbProduct.image_url || dbProduct.image;
      }
    }
    storeWishlist.push({ id: String(id), name, price: parseFloat(price), img });
  }

  localStorage.setItem("minee_wishlist", JSON.stringify(storeWishlist));
  syncWishlistUI();
};

function syncWishlistUI() {
  const storeWishlist =
    JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const badge = document.getElementById("wishlist-count-badge");
  const drawerList = document.getElementById("wishlist-items");

  if (badge) badge.innerText = storeWishlist.length;
  if (!drawerList) return;

  drawerList.innerHTML = "";
  if (storeWishlist.length === 0) {
    drawerList.innerHTML = `<li class="py-3 text-center text-neutral-400 italic text-xs">Favorites list empty.</li>`;
  } else {
    storeWishlist.forEach((item) => {
      drawerList.innerHTML += `
        <li class="flex items-center justify-between gap-2 border-b border-neutral-50 pb-2 last:border-0 text-xs">
          <div class="flex items-center gap-2 max-w-[70%]">
            <img src="${item.img || "./image/logo copy.png"}" class="w-8 h-8 object-contain rounded bg-neutral-50 border border-neutral-100 flex-shrink-0">
            <span class="truncate font-medium text-neutral-700">${item.name}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-pink-600">$${parseFloat(item.price).toFixed(2)}</span>
            <button onclick="toggleWishlistItem('${item.id}')" class="text-neutral-300 hover:text-red-500 cursor-pointer p-1 transition-colors">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </li>
      `;
    });
  }

  document.querySelectorAll("[data-id]").forEach((card) => {
    const cardId = card.getAttribute("data-id");
    const icon = card.querySelector(`.id-heart-${cardId}`);
    if (!icon) return;

    const isSaved = storeWishlist.some(
      (item) => String(item.id) === String(cardId),
    );
    if (isSaved) {
      icon.classList.remove("text-neutral-400");
      icon.classList.add("text-pink-500");
    } else {
      icon.classList.remove("text-pink-500");
      icon.classList.add("text-neutral-400");
    }
  });
}

let activeCategory = "all";
let searchDebounceTimeout = null;

function filterProducts() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    const searchInput = document.getElementById("search-input")?.value || "";
    fetchFilteredProducts(searchInput, activeCategory);
  }, 300);
}

function setCategoryFilter(category, event) {
  activeCategory = category;

  document.querySelectorAll(".cat-pill").forEach((btn) => {
    btn.classList.remove("bg-pink-500", "text-white");
    btn.classList.add("bg-white", "border-gray-200");
  });

  if (event && event.currentTarget) {
    event.currentTarget.classList.remove("bg-white", "border-gray-200");
    event.currentTarget.classList.add("bg-pink-500", "text-white");
  }

  const searchInput = document.getElementById("search-input")?.value || "";
  fetchFilteredProducts(searchInput, activeCategory);
}

async function fetchFilteredProducts(searchKeyword, categorySelection) {
  try {
    const params = new URLSearchParams({
      search: searchKeyword,
      category: categorySelection,
    });

    const response = await fetch(
      `${window.API_URL}/products?${params.toString()}`,
    );
    if (!response.ok) throw new Error("Database server sync was unsuccessful");

    productsDatabase = await response.json();
    console.log(
      `Live Filter: Loaded ${productsDatabase.length} items out of database.`,
    );

    window.renderProducts(productsDatabase);
    syncWishlistUI();
  } catch (error) {
    console.error("Failed querying active search rows from backend:", error);
  }
}

function updateCartUIDraw() {
  const cartBtn = document.getElementById("cart-button");
  const cartList = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  const totalItemsCount = cart.reduce(
    (acc, current) => acc + current.quantity,
    0,
  );
  if (cartBtn) {
    cartBtn.innerHTML = `<i class="fa-solid fa-shopping-cart text-pink-400"></i> Cart (${totalItemsCount})`;
  }

  if (cartList) {
    cartList.innerHTML = "";
    if (cart.length === 0) {
      cartList.innerHTML = `<li class="text-neutral-400 text-xs text-center py-4">Your bag is empty</li>`;
    } else {
      cart.forEach((item) => {
        const li = document.createElement("li");
        li.className =
          "flex items-center justify-between gap-2 text-xs py-1.5 border-b border-neutral-100 last:border-none";
        li.innerHTML = `
          <div class="flex items-center gap-2 truncate flex-1">
            <img src="${item.image}" class="w-6 h-6 object-cover rounded bg-neutral-100 flex-shrink-0">
            <div class="truncate">
              <p class="font-bold text-neutral-800 truncate text-[11px]">${item.title}</p>
              <p class="text-[10px] text-neutral-400">$${item.price.toFixed(2)}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 rounded-lg flex-shrink-0">
            <button onclick="decreaseQuantity('${item.id}')" class="hover:text-pink-500 font-bold px-1 cursor-pointer text-xs">-</button>
            <span class="font-semibold text-[11px] min-w-[10px] text-center">${item.quantity}</span>
            <button onclick="increaseQuantity('${item.id}')" class="hover:text-pink-500 font-bold px-1 cursor-pointer text-xs">+</button>
          </div>

          <button onclick="removeProductFromCart('${item.id}')" class="text-neutral-400 hover:text-red-500 transition px-1 cursor-pointer">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        `;
        cartList.appendChild(li);
      });
    }
  }

  const rawCalculatedTotal = cart.reduce(
    (acc, current) => acc + current.price * current.quantity,
    0,
  );

  if (cartTotal) {
    if (window.userQualifiesForDiscount && rawCalculatedTotal > 0) {
      const estimatedDiscount = rawCalculatedTotal * 0.05;
      const flatDeliveryFee = 1.5;
      const finalEstimatedTotal =
        rawCalculatedTotal - estimatedDiscount + flatDeliveryFee;

      cartTotal.innerHTML = `
        <div class="text-right space-y-0.5 text-xs">
          <div class="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block font-medium mb-1">
            First Order Discount Applied (5%)
          </div>
          <p class="text-neutral-500 font-normal text-[11px]">Subtotal: $${rawCalculatedTotal.toFixed(2)}</p>
          <p class="text-neutral-800 font-bold">Est. Total: $${finalEstimatedTotal.toFixed(2)}</p>
        </div>
      `;
    } else {
      cartTotal.innerText = `Total: $${rawCalculatedTotal.toFixed(2)}`;
    }
  }
}

window.confirmCart = function () {
  const latestCart = JSON.parse(localStorage.getItem("minee_cart") || "[]");

  if (latestCart.length === 0) {
    refreshFloatingCartUI();

    const cartPreview = document.getElementById("floating-cart-preview");

    if (cartPreview) {
      cartPreview.classList.remove("hidden");
    }

    return;
  }

  window.location.href = "checkout.html";
};

window.viewProductDetails = function (cardDiv) {
  const productBox = cardDiv.closest("[data-id]");
  if (!productBox) return;

  const textElement = productBox.querySelector("p");
  const priceElement =
    productBox.querySelector(".text-pink-600") ||
    productBox.querySelector('[class*="text-pink-"]');
  const imageElement = productBox.querySelector("img");

  const productData = {
    id: productBox.getAttribute("data-id"),
    type: productBox.getAttribute("data-type") || "Cosmetics",
    ingredients:
      productBox.getAttribute("data-ingredients") || "Natural Formula",
    name: textElement
      ? textElement.innerText.replace(/\n/g, " ")
      : "Skincare Product",
    price: priceElement ? priceElement.innerText : "$0.00",
    img: imageElement ? imageElement.src : "./image/logo copy.png",
  };

  localStorage.setItem("selectedProduct", JSON.stringify(productData));
  window.location.href = "product.html";
};

function setupNavigationAndPopups() {
  const menuToggle = document.getElementById("menu-toggle");
  const navMenu = document.getElementById("nav-menu");
  const menuIcon = document.getElementById("menu-icon");

  if (menuToggle && navMenu && menuIcon) {
    menuToggle.addEventListener("click", () => {
      navMenu.classList.toggle("hidden");
      menuIcon.className = navMenu.classList.contains("hidden")
        ? "fa-solid fa-bars"
        : "fa-solid fa-xmark";
    });
  }

  const cartBtn = document.getElementById("cart-button");
  const cartPreview = document.getElementById("cart-preview");
  const wishlistPreview = document.getElementById("wishlist-preview");

  if (cartBtn && cartPreview) {
    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (wishlistPreview) hidePanel(wishlistPreview);

      if (
        cartPreview.classList.contains("opacity-0") ||
        cartPreview.classList.contains("hidden")
      ) {
        showPanel(cartPreview);
      } else {
        hidePanel(cartPreview);
      }
    });

    document.addEventListener("click", (event) => {
      const isClickInsideCart = cartPreview.contains(event.target);
      const isClickOnCartButton =
        cartBtn.contains(event.target) || event.target === cartBtn;
      const isClickInsideWishlist = wishlistPreview
        ? wishlistPreview.contains(event.target)
        : false;

      if (
        !isClickInsideCart &&
        !isClickOnCartButton &&
        !isClickInsideWishlist
      ) {
        hidePanel(cartPreview);
        if (wishlistPreview) hidePanel(wishlistPreview);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cart = JSON.parse(localStorage.getItem("minee_cart")) || [];
  fetchProductsFromDatabase();
  setupNavigationAndPopups();
  syncWishlistUI();
});
