document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Cart UI
  syncCartUI();

  // 1. EXTRACT THE LIVE ID OUT OF THE WEBSITE URL LINK
  const urlParams = new URLSearchParams(window.location.search);
  let productId = urlParams.get('id');

  let currentProduct = null;

  // 2. FALLBACK LOOKUP STATE: Check localStorage if no link parameter is present
  if (!productId) {
    const backupData = JSON.parse(localStorage.getItem('selectedProduct'));
    if (backupData) productId = backupData.id;
  }

  if (productId) {
    try {
      // 3. FETCH DATA DIRECTLY FROM YOUR BACKEND MYSQL API
      const res = await fetch(`http://localhost:3000/api/products`);
      if (res.ok) {
        const allProducts = await res.json();
        
        // Find the specific matching product object by tracking all variations of ID naming
        currentProduct = allProducts.find(p => {
          const dbId = p.id !== undefined ? p.id : (p.ID !== undefined ? p.ID : p.product_id);
          return String(dbId) === String(productId);
        });
      }
    } catch (err) {
      console.error("Failed to query live product details from backend server:", err);
    }
  }

  // 5. RENDER THE CONTENT DYNAMICALLY IF THE PRODUCT EXISTS
  if (currentProduct) {
    // Normalize casing variants out of MySQL keys nicely
    const title = currentProduct.title || currentProduct.Title || currentProduct.name || 'Unnamed Product';
    const type = currentProduct.category || currentProduct.type || "Skincare Essential";
    const price = Number(currentProduct.price || currentProduct.Price || 0);
    const imgSrc = currentProduct.image_url || currentProduct.Image_Url || currentProduct.image || currentProduct.img || "./image/logo copy.png";
    const ingredients = currentProduct.ingredients || "Ingredients formulas are currently being synchronized with the MySQL server profile.";
    const stock = currentProduct.stock !== undefined ? parseInt(currentProduct.stock) : 5;

    // Inject live text into HTML elements
    document.getElementById('detail-title').innerText = title;
    document.getElementById('detail-type').innerText = type;
    document.getElementById('detail-price').innerText = `$${price.toFixed(2)}`;
    document.getElementById('detail-ingredients').innerText = ingredients;
    document.getElementById('detail-image').src = imgSrc;
    document.getElementById('detail-image').alt = title;

    // --- DYNAMIC IN-STOCK STATUS SYSTEM GRAPHIC ---
    const statusContainer = document.getElementById('detail-stock-status') || document.getElementById('detail-type');
    if (statusContainer) {
      let statusHtml = "";
      if (stock <= 0) {
        statusHtml = `<span class="ml-3 text-xs bg-red-50 text-red-500 font-bold px-2 py-1 rounded-md"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</span>`;
      } else if (stock <= 3) {
        statusHtml = `<span class="ml-3 text-xs bg-amber-50 text-amber-500 font-semibold px-2 py-1 rounded-md"><i class="fa-solid fa-fire"></i> Low Stock (${stock} left!)</span>`;
      } else {
        statusHtml = `<span class="ml-3 text-xs bg-emerald-50 text-emerald-600 font-medium px-2 py-1 rounded-md"><i class="fa-solid fa-boxes-stacked"></i> In Stock</span>`;
      }
      statusContainer.innerHTML += statusHtml;
    }

    // Lock out order button options if product is completely sold out
    const cartBtn = document.getElementById('add-to-cart-btn');
    if (cartBtn && stock <= 0) {
      cartBtn.disabled = true;
      cartBtn.innerText = "Sold Out";
      cartBtn.className = "w-full bg-neutral-200 text-neutral-400 font-bold py-3 rounded-xl cursor-not-allowed";
    }

    // Cart Handlers
    const addToCartHandler = () => {
      if (typeof addProductToCart === 'function') addProductToCart(productId);
      else if (typeof addToCart === 'function') addToCart(productId, title, price);
      syncCartUI();
    };

    if (cartBtn) cartBtn.onclick = addToCartHandler;
    
    // Wishlist Setup
    document.getElementById('detail-wishlist-btn').onclick = () => {
      if (typeof toggleWishlistItem === 'function') {
        toggleWishlistItem(productId, title, price, imgSrc);
        updateMainHeartUI(productId);
      }
    };

    updateMainHeartUI(productId);
    await loadDynamicRelatedItems(productId, type);
  } else {
    console.warn("Could not match product ID with live MySQL catalog rows.");
  }
});

// Sync Cart UI logic
function syncCartUI() {
  const cart = JSON.parse(localStorage.getItem("minee_cart")) || [];
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalElement = document.getElementById('cart-total');
  const cartButton = document.getElementById('cart-button');

  if (cartButton) cartButton.innerHTML = `<i class="fa-solid fa-shopping-cart text-pink-400"></i> Cart (${cart.length})`;

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<li class="text-center py-4 text-neutral-400">Your cart is empty.</li>';
    if (cartTotalElement) cartTotalElement.innerText = "Total: $0.00";
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = cart.map(item => {
    total += parseFloat(item.price) || 0;
    return `<li class="flex justify-between py-1 border-b border-neutral-50 text-sm"><span>${item.name}</span> <span class="font-semibold text-pink-600">$${parseFloat(item.price).toFixed(2)}</span></li>`;
  }).join('');
  if (cartTotalElement) cartTotalElement.innerText = `Total: $${total.toFixed(2)}`;
}

// Toggle Cart Preview
document.getElementById('cart-button')?.addEventListener('click', () => {
  document.getElementById('cart-preview')?.classList.toggle('hidden');
});

// --- FETCH RELATED FROM LIVE DATABASE ---
async function loadDynamicRelatedItems(currentId, currentType) {
  const gridContainer = document.getElementById('related-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = `<div class="text-neutral-400 text-sm col-span-3 text-center py-8">Loading recommendations...</div>`; 

  try {
    const response = await fetch('http://localhost:3000/api/products');
    if (!response.ok) throw new Error('Database server query unfulfilled');
    const allProducts = await response.json();
    
    let relatedItems = allProducts.filter(prod => 
      String(prod.id || prod.ID || prod.product_id) !== String(currentId) && 
      String(prod.category || prod.type || "").toLowerCase() === String(currentType || "").toLowerCase()
    );

    if (relatedItems.length < 3) {
      const extraItems = allProducts.filter(prod => String(prod.id || prod.ID || prod.product_id) !== String(currentId) && !relatedItems.some(r => r.id === prod.id));
      relatedItems = [...relatedItems, ...extraItems];
    }

    const finalDisplayList = relatedItems.slice(0, 3);
    gridContainer.innerHTML = ""; 

    if (finalDisplayList.length === 0) {
      gridContainer.innerHTML = `<p class="text-neutral-400 text-sm col-span-3 text-center">No related products found.</p>`;
      return;
    }

    finalDisplayList.forEach(prod => {
      const id = prod.id || prod.ID || prod.product_id;
      const title = prod.title || prod.name || "Skincare Product";
      const category = prod.category || prod.type || "Skincare";
      const price = parseFloat(prod.price) || 8.30;
      const image = prod.image || prod.image_url || prod.img || "./image/placeholder.jpeg";

      const cardHtml = `
        <div class="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col justify-between text-center hover:shadow-md transition-shadow group relative" data-id="${id}">
          <button onclick="event.stopPropagation(); if(typeof toggleWishlistItem === 'function'){ toggleWishlistItem('${id}', \`${title.replace(/'/g, "\\'")}\`, ${price}, '${image}') }" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-neutral-50/80 backdrop-blur-xs flex items-center justify-center hover:bg-white text-neutral-400 shadow-xs border border-neutral-100/50 cursor-pointer active:scale-90 transition-all z-10">
            <i class="fa-solid fa-heart text-xs id-heart-${id} transition-colors"></i>
          </button>
          
          <!-- FIXED LINK AND REMOVED STRAY '>' CHARACTER -->
          <a href="product-detail.html?id=${id}" class="block focus:outline-none">
            <img src="${image}" alt="${title}" class="w-full h-40 object-contain mb-3 rounded-xl group-hover:scale-102 transition-transform">
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">${category}</p>
            <p class="text-sm font-medium text-neutral-700 mb-2 min-h-[40px] line-clamp-2 group-hover:text-pink-500 transition-colors">${title}</p>
            <div class="text-base font-bold text-pink-600 mb-4">$${price.toFixed(2)}</div>
          </a>
          <button onclick="if(typeof addProductToCart === 'function'){ addProductToCart('${id}') }else{ addToCart('${id}', \`${title.replace(/'/g, "\\'")}\`, ${price}) }" class="w-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer mt-auto">Add to Cart</button>
        </div>
      `;
      gridContainer.innerHTML += cardHtml;
    });

    if (typeof syncWishlistUI === 'function') {
      syncWishlistUI();
    }

  } catch (error) {
    console.error("Database fetch failed:", error);
    gridContainer.innerHTML = `<p class="text-neutral-400 text-sm col-span-3 text-center py-4">Unable to load recommended items.</p>`;
  }
}

function updateMainHeartUI(id) {
  const heartIcon = document.getElementById('detail-heart-icon');
  if (!heartIcon) return;
  const storeWishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const isSaved = storeWishlist.some(item => String(item.id) === String(id));
  heartIcon.className = `fa-solid fa-heart text-lg ${isSaved ? "text-pink-500" : "text-neutral-400"}`;
}