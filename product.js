// ==========================================
// 1. DYNAMIC ASYNC DATABASE CONTAINER & CONFIG
// ==========================================
let productsDatabase = [];
let cart = [];
// Fetch live items directly out of your local MySQL server instance 
async function fetchProductsFromDatabase() {
  // ==========================================================
  // MODIFIED: BLOCKS AUTOMATIC INITIAL CATALOG LOAD ON BOOTUP
  // ==========================================================
  const productContainer = document.getElementById('product-container'); 
  const emptyState = document.getElementById('empty-search-state');
  
  if (productContainer) {
    // Inject the real-world empty search placeholder message instead of the products grid
    productContainer.innerHTML = `
      <div id="search-placeholder-view" class="col-span-full text-center py-20 flex flex-col items-center justify-center">
        <div class="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-4 text-pink-500 text-2xl">
          <i class="fa-solid fa-magnifying-glass animate-bounce"></i>
        </div>
        <h3 class="text-neutral-700 font-bold text-lg mb-1">Find your perfect match</h3>
        <p class="text-neutral-400 text-sm max-w-xs mx-auto">Type in the search bar above to look through our live beauty products!</p>
      </div>
    `;
  }
  
  if (emptyState) {
    emptyState.classList.add('hidden');
  }

  // Run minor structural UI checks so the rest of your app elements stay running smoothly
  try {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const userQueryKey = user && user.name ? user.name : "Guest";
    let isFirstOrder = true;

    try {
      const orderCheck = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(userQueryKey)}`);
      const orders = await orderCheck.json();
      isFirstOrder = (Array.isArray(orders) && orders.length === 0);
    } catch (e) {
      isFirstOrder = true; 
    }
    
    window.userQualifiesForDiscount = isFirstOrder;
    updateCartUIDraw();
    syncWishlistUI(); 
  } catch (error) {
    console.warn('Initial setups finalized without populating active cards grid.');
    if (typeof updateCartUIDraw === 'function') updateCartUIDraw();
    if (typeof syncWishlistUI === 'function') syncWishlistUI(); 
  }
}
// Fetch live items directly out of your local MySQL server instance 
/*async function fetchProductsFromDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/products');
    if (!response.ok) throw new Error('Network query was not successful');
    
    productsDatabase = await response.json();
    console.log(` Loaded ${productsDatabase.length} products live from MySQL Backend.`);
    
    const now = new Date();
    const productContainer = document.getElementById('product-container'); 
    if (productContainer) {
      productContainer.innerHTML = ''; 
    }

    productsDatabase.forEach(product => {
      const currentPrice = Number(product.price);
      const stockQuantity = product.stock !== undefined ? parseInt(product.stock) : 0;
      const finalImgSrc = product.image_url || product.image || "./image/logo copy.png";
      const userLimit = product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : 0;

      // --- AUTOMATED TIME-BASED DISCOUNT EVALUATION ---
      let discountPrice = null;
      if (product.discount_price && product.discount_start && product.discount_end) {
        const startTime = new Date(product.discount_start);
        const endTime = new Date(product.discount_end);
        if (now >= startTime && now <= endTime) {
          discountPrice = Number(product.discount_price);
        }
      } else if (product.discount_price && !product.discount_start) {
        // Fallback if no specific dates were set by admin but a sale price exists
        discountPrice = Number(product.discount_price);
      }

      // 1. Calculate and build the Dynamic Discount UI Elements
      let priceMarkup = `<div class="text-pink-600 font-bold text-base mb-3">$${currentPrice.toFixed(2)}</div>`;
      let saleBadge = '';
      let isPromoActive = false;
      
      if (discountPrice && discountPrice < currentPrice) {
        isPromoActive = true;
        priceMarkup = `
          <div class="flex items-center justify-center gap-2 mb-3">
            <span class="text-neutral-400 line-through text-xs">$${currentPrice.toFixed(2)}</span>
            <span class="text-pink-600 font-extrabold text-base">$${discountPrice.toFixed(2)}</span>
          </div>
        `;
        saleBadge = `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 animate-pulse shadow-sm">Hot Sale</span>`;
      }

      // 2. Build the Stock Tracking and Purchase Limitation state layouts
      let stockMarkup = `<p class="text-[11px] text-emerald-600 font-medium mb-2"><i class="fa-solid fa-boxes-stacked"></i> In Stock (${stockQuantity})</p>`;
      if (userLimit > 0) {
        stockMarkup += `<p class="text-[10px] text-amber-600 font-semibold mb-2"><i class="fa-solid fa-user-lock"></i> Limit: Max ${userLimit} per user</p>`;
      }

      let actionButtonMarkup = `
        <button onclick="addToCart('${product.id}')" class="w-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-95 cursor-pointer">
          Add to Cart
        </button>
      `;

      if (stockQuantity <= 0) {
        stockMarkup = `<p class="text-[11px] text-red-500 font-bold mb-2"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</p>`;
        actionButtonMarkup = `
          <button disabled class="w-full bg-neutral-200 text-neutral-400 text-xs font-bold py-2 rounded-xl cursor-not-allowed">
            Sold Out
          </button>
        `;
      }

      // --- RENDER DYNAMIC BACKEND PRODUCTS CONTAINER ---
      if (productContainer) {
        productContainer.innerHTML += `
          <div class="product-card bg-white border border-neutral-100 rounded-2xl p-4 relative shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" 
               data-id="${product.id}" data-type="${product.category || 'Skincare'}" data-ingredients="${product.ingredients || ''}" data-stock="${stockQuantity}" data-limit="${userLimit}">
            
            ${saleBadge}
            
            <div class="absolute top-3 right-3 z-10">
              <button onclick="toggleWishlistItem('${product.id}')" class="cursor-pointer text-lg">
                <i class="fa-solid fa-heart id-heart-${product.id} text-neutral-400 transition-colors"></i>
              </button>
            </div>
            
            <div onclick="viewProductDetails(this)" class="cursor-pointer group flex-grow">
              <div class="overflow-hidden rounded-xl mb-3 flex justify-center items-center h-48 bg-neutral-50">
                <img src="${finalImgSrc}" alt="${product.title}" class="max-h-40 object-contain group-hover:scale-105 transition-transform duration-300">
              </div>
              <p class="font-bold text-neutral-800 text-sm truncate group-hover:text-pink-500 transition-colors">${product.title}</p>
              <p class="text-xs text-neutral-400 mb-1">${product.brand || 'Minee Beauty'}</p>
              ${stockMarkup}
              ${priceMarkup}
            </div>
            
            <div class="mt-auto">
              ${actionButtonMarkup}
            </div>
          </div>
        `;
      }

      // --- BACKWARD COMPATIBILITY SYNC FOR STATIC HTML HARDCODED CARDS ---
      const staticCard = document.querySelector(`div[data-id="${product.id}"]`);
      if (staticCard) {
        // Sync administrative variables to the DOM dataset memory spaces
        staticCard.setAttribute('data-stock', stockQuantity);
        staticCard.setAttribute('data-limit', userLimit);

        // Update static layout pricing displays if an active discount applies
        if (isPromoActive) {
          const priceDiv = staticCard.querySelector('.text-pink-600') || staticCard.querySelector('[class*="text-pink-"]');
          if (priceDiv) {
            priceDiv.className = "flex items-center justify-center gap-2 mb-3";
            priceDiv.innerHTML = `
              <span class="text-neutral-400 line-through text-xs font-normal mr-2">$${currentPrice.toFixed(2)}</span>
              <span class="text-pink-600 font-extrabold text-base">$${discountPrice.toFixed(2)}</span>
            `;
          }
          if (!staticCard.querySelector('.animate-pulse')) {
            staticCard.classList.add('relative');
            staticCard.insertAdjacentHTML('afterbegin', `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 animate-pulse shadow-sm">Hot Sale</span>`);
          }
        }

        // Handle Sold Out visual blocker overlays for static grids
        if (stockQuantity <= 0) {
          const imgDiv = staticCard.querySelector('.cursor-pointer');
          if (imgDiv && !staticCard.innerHTML.includes('Sold Out')) {
            imgDiv.classList.add('relative', 'opacity-60');
            imgDiv.insertAdjacentHTML('beforeend', `
              <div class="absolute inset-0 flex items-center justify-center bg-neutral-900/20 rounded-xl">
                <span class="bg-white/95 text-neutral-800 text-xs font-black px-4 py-2 rounded-lg shadow-sm border tracking-wide uppercase">Sold Out</span>
              </div>
            `);
          }
          const actionBtn = staticCard.querySelector('button[onclick^="addToCart"]');
          if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.innerText = "Out of Stock";
            actionBtn.className = "w-full bg-neutral-200 text-neutral-400 text-sm font-semibold py-2 px-4 rounded-xl cursor-not-allowed mt-auto shadow-none";
            actionBtn.removeAttribute('onclick');
          }
        }
      }
    });

    // Handle user verification checks
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const userQueryKey = user && user.name ? user.name : "Guest";
    let isFirstOrder = true;

    try {
      const orderCheck = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(userQueryKey)}`);
      const orders = await orderCheck.json();
      isFirstOrder = (Array.isArray(orders) && orders.length === 0);
    } catch (e) {
      console.warn("Backend order history check missed. Defaulting to first-time user layout.");
      isFirstOrder = true; 
    }
    
    window.userQualifiesForDiscount = isFirstOrder;
    updateCartUIDraw();
    syncWishlistUI(); 
  } catch (error) {
    console.error(' Failed fetching products from MySQL Database backend: ', error);
    updateCartUIDraw();
    syncWishlistUI(); 
  }
}*/
// Exposes renderProducts globally so index.html search functions can access it cleanly
/*window.renderProducts = function(productsToRender) {
  const now = new Date();
  const productContainer = document.getElementById('product-container'); 
  const emptyState = document.getElementById('empty-search-state');

  if (productContainer) {
    productContainer.innerHTML = ''; 
  }

  // Handle empty search layouts cleanly
  if (!productsToRender || productsToRender.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  productsToRender.forEach(product => {
    const currentPrice = Number(product.price);
    const stockQuantity = product.stock !== undefined ? parseInt(product.stock) : 0;
    const finalImgSrc = product.image_url || product.image || "./image/logo copy.png";
    const userLimit = product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : 0;

    // --- AUTOMATED TIME-BASED DISCOUNT EVALUATION ---
    let discountPrice = null;
    if (product.discount_price && product.discount_start && product.discount_end) {
      const startTime = new Date(product.discount_start);
      const endTime = new Date(product.discount_end);
      if (now >= startTime && now <= endTime) {
        discountPrice = Number(product.discount_price);
      }
    } else if (product.discount_price && !product.discount_start) {
      discountPrice = Number(product.discount_price);
    }

    // Calculate and build the Dynamic Discount UI Elements
    let priceMarkup = `<div class="text-pink-600 font-bold text-base mb-3">$${currentPrice.toFixed(2)}</div>`;
    let saleBadge = '';
    
    if (discountPrice && discountPrice < currentPrice) {
      priceMarkup = `
        <div class="flex items-center justify-center gap-2 mb-3">
          <span class="text-neutral-400 line-through text-xs">$${currentPrice.toFixed(2)}</span>
          <span class="text-pink-600 font-extrabold text-base">$${discountPrice.toFixed(2)}</span>
        </div>
      `;
      saleBadge = `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 animate-pulse shadow-sm">Hot Sale</span>`;
    }

    // Build the Stock Tracking and Purchase Limitation state layouts
    let stockMarkup = `<p class="text-[11px] text-emerald-600 font-medium mb-2"><i class="fa-solid fa-boxes-stacked"></i> In Stock (${stockQuantity})</p>`;
    if (userLimit > 0) {
      stockMarkup += `<p class="text-[10px] text-amber-600 font-semibold mb-2"><i class="fa-solid fa-user-lock"></i> Limit: Max ${userLimit} per user</p>`;
    }

    let actionButtonMarkup = `
      <button onclick="addToCart('${product.id}')" class="w-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-95 cursor-pointer">
        Add to Cart
      </button>
    `;

    if (stockQuantity <= 0) {
      stockMarkup = `<p class="text-[11px] text-red-500 font-bold mb-2"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</p>`;
      actionButtonMarkup = `
        <button disabled class="w-full bg-neutral-200 text-neutral-400 text-xs font-bold py-2 rounded-xl cursor-not-allowed">
          Sold Out
        </button>
      `;
    }

    // Render cards dynamic properties
    if (productContainer) {
      productContainer.innerHTML += `
        <div class="product-card bg-white border border-neutral-100 rounded-2xl p-4 relative shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" 
             data-id="${product.id}" data-type="${product.category || 'Skincare'}" data-ingredients="${product.ingredients || ''}" data-stock="${stockQuantity}" data-limit="${userLimit}">
          
          ${saleBadge}
          
          <div class="absolute top-3 right-3 z-10">
            <button onclick="toggleWishlistItem('${product.id}')" class="cursor-pointer text-lg">
              <i class="fa-solid fa-heart id-heart-${product.id} text-neutral-400 transition-colors"></i>
            </button>
          </div>
          
          <div onclick="viewProductDetails(this)" class="cursor-pointer group flex-grow">
            <div class="overflow-hidden rounded-xl mb-3 flex justify-center items-center h-48 bg-neutral-50">
              <img src="${finalImgSrc}" alt="${product.title}" class="max-h-40 object-contain group-hover:scale-105 transition-transform duration-300">
            </div>
            <p class="font-bold text-neutral-800 text-sm truncate group-hover:text-pink-500 transition-colors">${product.title}</p>
            <p class="text-xs text-neutral-400 mb-1">${product.brand || 'Minee Beauty'}</p>
            ${stockMarkup}
            ${priceMarkup}
          </div>
          
          <div class="mt-auto">
            ${actionButtonMarkup}
          </div>
        </div>
      `;
    }
  });
};*/
// ឧទាហរណ៍៖ កូដ renderProducts ដែលត្រឹមត្រូវនៅក្នុង product.js
window.renderProducts = function(filteredResults) {
  const container = document.getElementById('product-container');
  if (!container) return;

  if (!filteredResults || filteredResults.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center text-neutral-500 py-8">No products found</p>`;
    return;
  }

  const now = new Date();

  container.innerHTML = filteredResults.map(prod => {
    // Escape strings safely
    const escapedTitle = (prod.title || prod.name || "Skincare Item").replace(/'/g, "\\'");
    const escapedCategory = (prod.category || prod.type || "Essential").replace(/'/g, "\\'");
    const escapedImg = (prod.image_url || prod.image || prod.img || "./image/logo copy.png").replace(/'/g, "\\'");
    const escapedIngredients = (prod.ingredients || "").replace(/'/g, "\\'");
    
    const standardPrice = parseFloat(prod.price || 0);
    
    // Check if promotional discount is active
    let hasActiveDiscount = false;
    let finalPrice = standardPrice;

    if (prod.discount_price !== null && prod.discount_price !== undefined && parseFloat(prod.discount_price) > 0) {
      const start = prod.discount_start ? new Date(prod.discount_start) : null;
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
      // Always show standard price explicitly when there's no active promo if preferred
      priceHtml = `<div class="text-pink-600 font-extrabold mt-2">$${formattedStandardPrice}</div>`;
    }

    return `
      <div class="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm flex flex-col justify-between relative" data-id="${prod.id}" data-limit="${prod.limit_per_user || 0}" data-stock="${prod.stock || 10}">
        
        <!-- Product Image & Detail View Trigger -->
        <div onclick="viewProductDetail('${prod.id}', \`${escapedTitle}\`, \`${escapedCategory}\`, '$${formattedPrice}', '${escapedImg}', \`${escapedIngredients}\`)" 
             class="bg-neutral-50 rounded-xl p-4 flex justify-center items-center h-48 mb-4 cursor-pointer overflow-hidden group relative">
          ${hasActiveDiscount ? '<span class="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded z-10">SALE</span>' : ''}
          <img src="${escapedImg}" alt="${escapedTitle}" class="max-h-40 object-contain group-hover:scale-105 transition-transform duration-300">
        </div>
        
        <div class="text-left flex-grow">
          <h3 class="font-bold text-neutral-800 text-sm mt-1 cursor-pointer hover:text-pink-500 transition-colors" 
              onclick="viewProductDetail('${prod.id}', \`${escapedTitle}\`, \`${escapedCategory}\`, '$${formattedPrice}', '${escapedImg}', \`${escapedIngredients}\`)">
            ${prod.title || prod.name}
          </h3>
          ${priceHtml}
        </div>
        
        <!-- Add to Cart Button -->
        <button onclick="addToCart('${prod.id}')" 
                class="w-full mt-4 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center block">
          Add to Cart
        </button>
      </div>
    `;
  }).join('');
};
// ==========================================
// HELPER ANIMATION TRANSITION HANDLERS
// ==========================================
function showPanel(panelElement) {
  if (!panelElement) return;
  panelElement.classList.remove('opacity-0', 'scale-95', 'pointer-events-none', 'hidden');
  panelElement.classList.add('opacity-100', 'scale-100');
}

function hidePanel(panelElement) {
  if (!panelElement) return;
  panelElement.classList.remove('opacity-100', 'scale-100');
  panelElement.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
}

// ==========================================
// 2. CORE CART SYSTEM INTERACTIONS
/*function addProductToCart(productId) {
  const lookupId = String(productId);
  
  // 1. Look up the live item inside the database array synced from your MySQL server
  let product = productsDatabase.find(p => String(p.id) === lookupId);
  const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);
  
  if (!product) {
    // Fallback for static HTML scrape if database is still loading
    const textSelector = itemContainer?.querySelector('p');
    const imageElement = itemContainer?.querySelector('img');
    const priceSelector = itemContainer?.querySelector('.text-pink-600') || itemContainer?.querySelector('[class*="text-pink-"]');

    product = {
      id: lookupId,
      title: textSelector ? textSelector.innerText : "Skincare Item",
      price: priceSelector ? parseFloat(priceSelector.innerText.replace('$', '')) : 8.30,
      image: imageElement ? imageElement.getAttribute('src') : "./image/logo copy.png"
    };
  }

  // 2. --- ADMIN CONTROLLED STOCK CHECK ---
  // Read stock value straight from your MySQL backend data properties
  let maxStock = 0;
  if (product && product.stock !== undefined) {
    maxStock = parseInt(product.stock);
  } else if (itemContainer && itemContainer.getAttribute('data-stock') !== null) {
    maxStock = parseInt(itemContainer.getAttribute('data-stock'));
  }

  // 3. Count how many the user has already added to their cart
  const existingItem = cart.find(item => String(item.id) === lookupId);
  const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

  // 4. Validation Guard: If quantity in cart matches or exceeds admin stock, block it!
  if (currentQuantityInCart >= maxStock) {
    alert(`Only ${maxStock} items are available!!.`);
    return; // Stops execution immediately
  }
  // ---------------------------------------

  // Determine actual purchase price
  const finalPrice = product.discount_price ? Number(product.discount_price) : Number(product.price);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: lookupId,
      title: product.title,
      price: finalPrice,
      image: product.image_url || product.image || "./image/logo copy.png",
      quantity: 1
    });
  }

  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
}*/

/*function addProductToCart(productId) {
  const lookupId = String(productId);
  const now = new Date();

  // 1. Locate product database data
  let product = productsDatabase.find(p => String(p.id) === lookupId);
  const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);

  if (!product) {
    const textSelector = itemContainer?.querySelector('p');
    const imageElement = itemContainer?.querySelector('img');
    const priceSelector = itemContainer?.querySelector('.text-pink-600') || itemContainer?.querySelector('[class*="text-pink-"]');

    product = {
      id: lookupId,
      title: textSelector ? textSelector.innerText : "Skincare Item",
      price: priceSelector ? parseFloat(priceSelector.innerText.replace('$', '')) : 8.30,
      image: imageElement ? imageElement.getAttribute('src') : "./image/logo copy.png",
      limit_per_user: itemContainer?.getAttribute('data-limit') ? parseInt(itemContainer.getAttribute('data-limit')) : 0
    };
  }

  // 2. Determine if the promotional discount windows are active right now
  let activePromoPrice = null;
  if (product.discount_price && product.discount_start && product.discount_end) {
    const startTime = new Date(product.discount_start);
    const endTime = new Date(product.discount_end);

    if (now >= startTime && now <= endTime) {
      activePromoPrice = Number(product.discount_price);
    }
  }

  // 3. Establish the runtime transactional limit parameters
  const finalPrice = activePromoPrice !== null ? activePromoPrice : Number(product.price);
  const maxStock = product.stock !== undefined ? parseInt(product.stock) : (itemContainer?.getAttribute('data-stock') ? parseInt(itemContainer.getAttribute('data-stock')) : 3);
  
  // Set the structural limit per user based on admin records
  const userPurchaseLimit = product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : (itemContainer?.getAttribute('data-limit') ? parseInt(itemContainer.getAttribute('data-limit')) : 0);

  const existingItem = cart.find(item => String(item.id) === lookupId);
  const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

  // 4. RULE ENFORCEMENT A: Limit Per User Check
  if (userPurchaseLimit > 0 && currentQuantityInCart >= userPurchaseLimit) {
    alert(`Restriction Notice: The administration has limited purchase bounds for "${product.title}" to a maximum of ${userPurchaseLimit} per user.`);
    return;
  }

  // 5. RULE ENFORCEMENT B: Standard Physical Stock Level Pool Guard
  if (currentQuantityInCart >= maxStock) {
    alert(`Sorry! We only have ${maxStock} items available in our total live inventory pool right now.`);
    return;
  }

  // 6. Push data safely to the cart array structure
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: lookupId,
      title: product.title,
      price: finalPrice,
      image: product.image_url || product.image || "./image/logo copy.png",
      quantity: 1
    });
  }

  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
}

window.removeProductFromCart = function(productId) {
  cart = cart.filter(item => String(item.id) !== String(productId));
  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

// ==========================================
// 3. CORE WISHLIST SYSTEM INTERACTIONS
// ==========================================
window.toggleWishlist = function() {
  const wishlistPanel = document.getElementById("wishlist-preview");
  const cartPanel = document.getElementById("cart-preview");
  if (!wishlistPanel) return;

  if (wishlistPanel.classList.contains('opacity-0') || wishlistPanel.classList.contains('hidden')) {
    if (cartPanel) hidePanel(cartPanel);
    showPanel(wishlistPanel);
  } else {
    hidePanel(wishlistPanel);
  }
};

window.toggleWishlistItem = function(id, name, price, img) {
  let storeWishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const index = storeWishlist.findIndex(item => String(item.id) === String(id));

  if (index > -1) {
    storeWishlist.splice(index, 1);
  } else {
    if (!name) {
      const dbProduct = productsDatabase.find(p => String(p.id) === String(id));
      if (dbProduct) {
        name = dbProduct.title;
        price = dbProduct.discount_price ? dbProduct.discount_price : dbProduct.price;
        img = dbProduct.image_url || dbProduct.image;
      }
    }
    storeWishlist.push({ id: String(id), name, price: parseFloat(price), img });
  }

  localStorage.setItem("minee_wishlist", JSON.stringify(storeWishlist));
  syncWishlistUI();
};*/
// ==========================================
// SEARCH & FILTER SYSTEM ENGINE (DATABASE PIPELINE)
// ==========================================
/*let activeCategory = 'all'; 
let searchDebounceTimeout = null;

// 1. Called on keyup inside your search input field
function filterProducts() {
  // Clear timeout to prevent overloading your MySQL backend on every keystroke
  clearTimeout(searchDebounceTimeout);
  
  searchDebounceTimeout = setTimeout(() => {
    // Collect variables directly from the HTML inputs
    const searchInput = document.getElementById('search-input')?.value || '';
    
    // Call the network endpoint with active filters
    fetchFilteredProducts(searchInput, activeCategory);
  }, 300); // Wait for the student/user to pause typing for 300ms
}

// 2. Called when clicking your Tailwind category pill buttons
function setCategoryFilter(category, event) {
  activeCategory = category;
  
  // Update Tailwind active button state highlights
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('bg-pink-500', 'text-white');
    btn.classList.add('bg-white', 'border-gray-200');
  });
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.remove('bg-white', 'border-gray-200');
    event.currentTarget.classList.add('bg-pink-500', 'text-white');
  }

  // Categories query the database instantly
  const searchInput = document.getElementById('search-input')?.value || '';
  fetchFilteredProducts(searchInput, activeCategory);
}

// 3. New helper function to request matching criteria safely from your Node/Express server
async function fetchFilteredProducts(searchKeyword, categorySelection) {
  try {
    // Build query parameters matching your Express backend route setup
    const params = new URLSearchParams({
      search: searchKeyword,
      category: categorySelection
    });

    const response = await fetch(`http://localhost:3000/api/products?${params.toString()}`);
    if (!response.ok) throw new Error('Database server sync was unsuccessful');
    
    // Overwrite global products array with your database results
    productsDatabase = await response.json();
    console.log(`Live Filter: Loaded ${productsDatabase.length} items out of MySQL database.`);

    const now = new Date();
    const productContainer = document.getElementById('product-container');
    const emptyState = document.getElementById('empty-search-state');

    if (productContainer) {
      productContainer.innerHTML = '';
    }

    // If zero rows are returned, show your "No products found" state element
    if (productsDatabase.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    // Loop through filtered database rows and inject into your main grid container
    productsDatabase.forEach(product => {
      const currentPrice = Number(product.price);
      const stockQuantity = product.stock !== undefined ? parseInt(product.stock) : 0;
      const finalImgSrc = product.image_url || product.image || "./image/logo copy.png";
      const userLimit = product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : 0;

      // --- AUTOMATED TIME-BASED DISCOUNT EVALUATION ---
      let discountPrice = null;
      if (product.discount_price && product.discount_start && product.discount_end) {
        const startTime = new Date(product.discount_start);
        const endTime = new Date(product.discount_end);
        if (now >= startTime && now <= endTime) {
          discountPrice = Number(product.discount_price);
        }
      } else if (product.discount_price && !product.discount_start) {
        discountPrice = Number(product.discount_price);
      }

      let priceMarkup = `<div class="text-pink-600 font-bold text-base mb-3">$${currentPrice.toFixed(2)}</div>`;
      let saleBadge = '';
      
      if (discountPrice && discountPrice < currentPrice) {
        priceMarkup = `
          <div class="flex items-center justify-center gap-2 mb-3">
            <span class="text-neutral-400 line-through text-xs">$${currentPrice.toFixed(2)}</span>
            <span class="text-pink-600 font-extrabold text-base">$${discountPrice.toFixed(2)}</span>
          </div>
        `;
        saleBadge = `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 animate-pulse shadow-sm">Hot Sale</span>`;
      }

      let stockMarkup = `<p class="text-[11px] text-emerald-600 font-medium mb-2"><i class="fa-solid fa-boxes-stacked"></i> In Stock (${stockQuantity})</p>`;
      if (userLimit > 0) {
        stockMarkup += `<p class="text-[10px] text-amber-600 font-semibold mb-2"><i class="fa-solid fa-user-lock"></i> Limit: Max ${userLimit} per user</p>`;
      }

      let actionButtonMarkup = `
        <button onclick="addToCart('${product.id}')" class="w-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-95 cursor-pointer">
          Add to Cart
        </button>
      `;

      if (stockQuantity <= 0) {
        stockMarkup = `<p class="text-[11px] text-red-500 font-bold mb-2"><i class="fa-solid fa-triangle-exclamation"></i> Out of Stock</p>`;
        actionButtonMarkup = `
          <button disabled class="w-full bg-neutral-200 text-neutral-400 text-xs font-bold py-2 rounded-xl cursor-not-allowed">
            Sold Out
          </button>
        `;
      }

      if (productContainer) {
        productContainer.innerHTML += `
          <div class="product-card bg-white border border-neutral-100 rounded-2xl p-4 relative shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" 
               data-id="${product.id}" data-type="${product.category || 'Skincare'}" data-ingredients="${product.ingredients || ''}" data-stock="${stockQuantity}" data-limit="${userLimit}">
            ${saleBadge}
            <div class="absolute top-3 right-3 z-10">
              <button onclick="toggleWishlistItem('${product.id}')" class="cursor-pointer text-lg">
                <i class="fa-solid fa-heart id-heart-${product.id} text-neutral-400 transition-colors"></i>
              </button>
            </div>
            <div onclick="viewProductDetails(this)" class="cursor-pointer group flex-grow">
              <div class="overflow-hidden rounded-xl mb-3 flex justify-center items-center h-48 bg-neutral-50">
                <img src="${finalImgSrc}" alt="${product.title}" class="max-h-40 object-contain group-hover:scale-105 transition-transform duration-300">
              </div>
              <p class="font-bold text-neutral-800 text-sm truncate group-hover:text-pink-500 transition-colors">${product.title}</p>
              <p class="text-xs text-neutral-400 mb-1">${product.brand || 'Minee Beauty'}</p>
              ${stockMarkup}
              ${priceMarkup}
            </div>
            <div class="mt-auto">
              ${actionButtonMarkup}
            </div>
          </div>
        `;
      }
    });

    // Make sure other parts of your UI stay accurately updated
    syncWishlistUI();
  } catch (error) {
    console.error('Failed querying active search rows from backend:', error);
  }
}*/

//
function addProductToCart(productId) {
  const lookupId = String(productId);
  const now = new Date();

  // 1. Locate product database data safely (with fallback check if database hasn't loaded yet)
  let product = (typeof productsDatabase !== 'undefined' && productsDatabase) 
    ? productsDatabase.find(p => String(p.id) === lookupId) 
    : null;
    
  const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);

  if (!product) {
    if (!itemContainer) {
      console.warn(`Could not find item layout container for ID: ${lookupId}`);
      return;
    }
    const textSelector = itemContainer.querySelector('p');
    const imageElement = itemContainer.querySelector('img');
    const priceSelector = itemContainer.querySelector('.text-pink-600') || itemContainer.querySelector('[class*="text-pink-"]');

    product = {
      id: lookupId,
      title: textSelector ? textSelector.innerText : "Skincare Item",
      price: priceSelector ? parseFloat(priceSelector.innerText.replace('$', '')) : 8.30,
      image: imageElement ? imageElement.getAttribute('src') : "./image/logo copy.png",
      limit_per_user: itemContainer.getAttribute('data-limit') ? parseInt(itemContainer.getAttribute('data-limit')) : 0
    };
  }

  // 2. Determine if the promotional discount windows are active right now
  let activePromoPrice = null;
  if (product.discount_price && product.discount_start && product.discount_end) {
    const startTime = new Date(product.discount_start);
    const endTime = new Date(product.discount_end);

    if (now >= startTime && now <= endTime) {
      activePromoPrice = Number(product.discount_price);
    }
  } else if (product.discount_price && !product.discount_start) {
    activePromoPrice = Number(product.discount_price);
  }

  // 3. Establish the runtime transactional limit parameters
  const finalPrice = activePromoPrice !== null ? activePromoPrice : Number(product.price);
  const maxStock = product.stock !== undefined ? parseInt(product.stock) : (itemContainer?.getAttribute('data-stock') ? parseInt(itemContainer.getAttribute('data-stock')) : 3);
  
  // Set the structural limit per user based on admin records
  const userPurchaseLimit = product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : (itemContainer?.getAttribute('data-limit') ? parseInt(itemContainer.getAttribute('data-limit')) : 0);

  const existingItem = cart.find(item => String(item.id) === lookupId);
  const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

  // 4. RULE ENFORCEMENT A: Limit Per User Check
  if (userPurchaseLimit > 0 && currentQuantityInCart >= userPurchaseLimit) {
    alert(`Restriction Notice: The administration has limited purchase bounds for "${product.title}" to a maximum of ${userPurchaseLimit} per user.`);
    return;
  }

  // 5. RULE ENFORCEMENT B: Standard Physical Stock Level Pool Guard
  if (currentQuantityInCart >= maxStock) {
    alert(`Sorry! We only have ${maxStock} items available in our total live inventory pool right now.`);
    return;
  }

  // 6. Push data safely to the cart array structure
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: lookupId,
      title: product.title,
      price: finalPrice,
      image: product.image_url || product.image || "./image/logo copy.png",
      quantity: 1
    });
  }

  localStorage.setItem("minee_cart", JSON.stringify(cart));
  if (typeof updateCartUIDraw === "function") updateCartUIDraw();
}

// Make sure your shortcut wrapper global window function handles incoming clicks cleanly
window.addToCart = function(id) {
  addProductToCart(String(id));
};

window.removeProductFromCart = function(productId) {
  cart = cart.filter(item => String(item.id) !== String(productId));
  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

// ==========================================
// CART QUANTITY MODIFIERS (INCREASE & DECREASE)
// ==========================================
window.increaseQuantity = function(productId) {
  const lookupId = String(productId);
  const existingItem = cart.find(item => String(item.id) === lookupId);
  
  if (!existingItem) return;

  let product = (typeof productsDatabase !== 'undefined' && productsDatabase) 
    ? productsDatabase.find(p => String(p.id) === lookupId) 
    : null;
  const itemContainer = document.querySelector(`div[data-id="${lookupId}"]`);

  const maxStock = product?.stock !== undefined 
    ? parseInt(product.stock) 
    : (itemContainer?.getAttribute('data-stock') ? parseInt(itemContainer.getAttribute('data-stock')) : 3);
  
  const userPurchaseLimit = product?.limit_per_user !== undefined 
    ? parseInt(product.limit_per_user) 
    : (itemContainer?.getAttribute('data-limit') ? parseInt(itemContainer.getAttribute('data-limit')) : 0);

  if (userPurchaseLimit > 0 && existingItem.quantity >= userPurchaseLimit) {
    alert(`Restriction Notice: Maximum purchase limit for this item is ${userPurchaseLimit}.`);
    return;
  }

  if (existingItem.quantity >= maxStock) {
    alert(`Sorry! Only ${maxStock} items available in our total inventory right now.`);
    return;
  }

  existingItem.quantity += 1;
  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

window.decreaseQuantity = function(productId) {
  const lookupId = String(productId);
  const existingItem = cart.find(item => String(item.id) === lookupId);

  if (!existingItem) return;

  if (existingItem.quantity > 1) {
    existingItem.quantity -= 1;
  } else {
    cart = cart.filter(item => String(item.id) !== lookupId);
  }

  localStorage.setItem("minee_cart", JSON.stringify(cart));
  updateCartUIDraw();
};

// ==========================================
// 3. CORE WISHLIST SYSTEM INTERACTIONS
// ==========================================
window.toggleWishlist = function() {
  const wishlistPanel = document.getElementById("wishlist-preview");
  const cartPanel = document.getElementById("cart-preview");
  if (!wishlistPanel) return;

  if (wishlistPanel.classList.contains('opacity-0') || wishlistPanel.classList.contains('hidden')) {
    if (cartPanel) hidePanel(cartPanel);
    showPanel(wishlistPanel);
  } else {
    hidePanel(wishlistPanel);
  }
};

window.toggleWishlistItem = function(id, name, price, img) {
  let storeWishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const index = storeWishlist.findIndex(item => String(item.id) === String(id));

  if (index > -1) {
    storeWishlist.splice(index, 1);
  } else {
    if (!name) {
      const dbProduct = productsDatabase.find(p => String(p.id) === String(id));
      if (dbProduct) {
        name = dbProduct.title;
        price = dbProduct.discount_price ? dbProduct.discount_price : dbProduct.price;
        img = dbProduct.image_url || dbProduct.image;
      }
    }
    storeWishlist.push({ id: String(id), name, price: parseFloat(price), img });
  }

  localStorage.setItem("minee_wishlist", JSON.stringify(storeWishlist));
  syncWishlistUI();
};

function syncWishlistUI() {
  const storeWishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
  const badge = document.getElementById("wishlist-count-badge");
  const drawerList = document.getElementById("wishlist-items");

  if (badge) badge.innerText = storeWishlist.length;
  if (!drawerList) return;

  drawerList.innerHTML = "";
  if (storeWishlist.length === 0) {
    drawerList.innerHTML = `<li class="py-3 text-center text-neutral-400 italic text-xs">Favorites list empty.</li>`;
  } else {
    storeWishlist.forEach(item => {
      drawerList.innerHTML += `
        <li class="flex items-center justify-between gap-2 border-b border-neutral-50 pb-2 last:border-0 text-xs">
          <div class="flex items-center gap-2 max-w-[70%]">
            <img src="${item.img || './image/logo copy.png'}" class="w-8 h-8 object-contain rounded bg-neutral-50 border border-neutral-100 flex-shrink-0">
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
  // SEARCH & FILTER SYSTEM ENGINE
// ==========================================
let activeCategory = 'all'; 
let searchDebounceTimeout = null;

function filterProducts() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    const searchInput = document.getElementById('search-input')?.value || '';
    fetchFilteredProducts(searchInput, activeCategory);
  }, 300);
}

function setCategoryFilter(category, event) {
  activeCategory = category;
  
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('bg-pink-500', 'text-white');
    btn.classList.add('bg-white', 'border-gray-200');
  });
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.remove('bg-white', 'border-gray-200');
    event.currentTarget.classList.add('bg-pink-500', 'text-white');
  }

  const searchInput = document.getElementById('search-input')?.value || '';
  fetchFilteredProducts(searchInput, activeCategory);
}

async function fetchFilteredProducts(searchKeyword, categorySelection) {
  try {
    const params = new URLSearchParams({
      search: searchKeyword,
      category: categorySelection
    });

    const response = await fetch(`http://localhost:3000/api/products?${params.toString()}`);
    if (!response.ok) throw new Error('Database server sync was unsuccessful');
    
    productsDatabase = await response.json();
    console.log(`Live Filter: Loaded ${productsDatabase.length} items out of MySQL database.`);

    // Pass the newly parsed array data down to our engine
    window.renderProducts(productsDatabase);
    syncWishlistUI();
  } catch (error) {
    console.error('Failed querying active search rows from backend:', error);
  }
}
fetchProductsFromDatabase();
///
  document.querySelectorAll('[data-id]').forEach(card => {
    const cardId = card.getAttribute('data-id');
    const icon = card.querySelector(`.id-heart-${cardId}`);
    if (!icon) return;

    const isSaved = storeWishlist.some(item => String(item.id) === String(cardId));
    if (isSaved) {
      icon.classList.remove('text-neutral-400');
      icon.classList.add('text-pink-500');
    } else {
      icon.classList.remove('text-pink-500');
      icon.classList.add('text-neutral-400');
    }
  });
}

// ==========================================
// 4. UI RENDERING PIPELINE
// ==========================================
function updateCartUIDraw() {
  const cartBtn = document.getElementById("cart-button");
  const cartList = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  const totalItemsCount = cart.reduce((acc, current) => acc + current.quantity, 0);
  if (cartBtn) {
    cartBtn.innerHTML = `<i class="fa-solid fa-shopping-cart text-pink-400"></i> Cart (${totalItemsCount})`;
  }

  if (cartList) {
    cartList.innerHTML = "";
    if (cart.length === 0) {
      cartList.innerHTML = `<li class="text-neutral-400 text-xs text-center py-4">Your bag is empty</li>`;
    } else {
      cart.forEach(item => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between gap-2 text-xs py-1.5 border-b border-neutral-100 last:border-none";
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

  const rawCalculatedTotal = cart.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  
  if (cartTotal) {
    if (window.userQualifiesForDiscount && rawCalculatedTotal > 0) {
      const estimatedDiscount = rawCalculatedTotal * 0.05;
      const flatDeliveryFee = 1.50;
      const finalEstimatedTotal = rawCalculatedTotal - estimatedDiscount + flatDeliveryFee;

      cartTotal.innerHTML = `
        <div class="text-right space-y-0.5 text-xs">
          <div class="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block font-medium mb-1">
            ✨ First Order Discount Applied (5%)
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

// ==========================================
// 5. ROUTING & PRODUCT DETAILS LOGIC
// ==========================================
window.confirmCart = function() {
  if (cart.length === 0) {
    alert("Your shopping bag is completely empty!");
    return;
  }
  window.location.href = "checkout.html";
};

window.viewProductDetails = function(cardDiv) {
  const productBox = cardDiv.closest('[data-id]');
  if (!productBox) return;
  
  const textElement = productBox.querySelector('p');
  const priceElement = productBox.querySelector('.text-pink-600') || productBox.querySelector('[class*="text-pink-"]');
  const imageElement = productBox.querySelector('img');

  const productData = {
    id: productBox.getAttribute('data-id'),
    type: productBox.getAttribute('data-type') || "Cosmetics",
    ingredients: productBox.getAttribute('data-ingredients') || "Natural Formula",
    name: textElement ? textElement.innerText.replace(/\n/g, ' ') : "Skincare Product",
    price: priceElement ? priceElement.innerText : "$0.00",
    img: imageElement ? imageElement.src : "./image/logo copy.png"
  };

  localStorage.setItem('selectedProduct', JSON.stringify(productData));
  window.location.href = 'product.html'; // Points smoothly to your product template file
};

// ==========================================
// 6. RESPONSIVE NAVIGATION & POPUP SYSTEM
// ==========================================
function setupNavigationAndPopups() {
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const menuIcon = document.getElementById('menu-icon');

  if (menuToggle && navMenu && menuIcon) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('hidden');
      menuIcon.className = navMenu.classList.contains('hidden') ? 'fa-solid fa-bars' : 'fa-solid fa-xmark';
    });
  }

  const cartBtn = document.getElementById('cart-button');
  const cartPreview = document.getElementById('cart-preview');
  const wishlistPreview = document.getElementById('wishlist-preview');
  
  if (cartBtn && cartPreview) {
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (wishlistPreview) hidePanel(wishlistPreview);

      if (cartPreview.classList.contains('opacity-0') || cartPreview.classList.contains('hidden')) {
        showPanel(cartPreview);
      } else {
        hidePanel(cartPreview);
      }
    });
    
    document.addEventListener('click', (event) => {
      const isClickInsideCart = cartPreview.contains(event.target);
      const isClickOnCartButton = cartBtn.contains(event.target) || event.target === cartBtn;
      const isClickInsideWishlist = wishlistPreview ? wishlistPreview.contains(event.target) : false;
      
      if (!isClickInsideCart && !isClickOnCartButton && !isClickInsideWishlist) {
        hidePanel(cartPreview);
        if (wishlistPreview) hidePanel(wishlistPreview);
      }
    });
  }
}

// ==========================================
// 7. INITIALIZATION PIPELINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Pull current cart items out of web storage if they exist
  cart = JSON.parse(localStorage.getItem("minee_cart")) || [];
  fetchProductsFromDatabase();
  setupNavigationAndPopups();
  syncWishlistUI(); 
});