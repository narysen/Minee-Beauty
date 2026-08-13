document.addEventListener("DOMContentLoaded", () => {
      // Initialize systems
      refreshFloatingCartUI();
      syncWishlistUI();
      setupMenuToggle();
      checkLiveDatabaseStockAndDiscounts();

      // Setup main cart button toggle action path
      const cartBtn = document.getElementById('cart-button');
      const cartPreview = document.getElementById('cart-preview');
      if (cartBtn && cartPreview) {
        cartBtn.onclick = (e) => {
          e.stopPropagation();
          cartPreview.classList.toggle('hidden');
          const wishlistPreview = document.getElementById('wishlist-preview');
          if (wishlistPreview) {
            wishlistPreview.classList.add('hidden'); // Close wishlist if open
          }
        };
      }
    });

    // --- MOBILE MENU HAMBURGER CONTROLLER ---
    function setupMenuToggle() {
      const toggle = document.getElementById('menu-toggle');
      const menu = document.getElementById('nav-menu');
      if (toggle && menu) {
        toggle.onclick = () => {
          menu.classList.toggle('hidden');
        };
      }
    }

    // --- ADD ITEM TO CART LOGIC (WITH AUTH CHECK) ---
    window.addToCart = function(id, title, price) {
      // Check if user is logged in (Modify 'minee_user' to match your login system key if needed)
      const isLoggedIn = localStorage.getItem('minee_user') !== null;

      if (!isLoggedIn) {
        alert("Please log in or create an account to add items to your cart!");
        // Optional: Uncomment below if you have a login page URL
        // window.location.href = "login.html";
        return;
      }

      let cart = JSON.parse(localStorage.getItem('minee_cart')) || [];
      const existingItem = cart.find(item => String(item.id) === String(id));

      // Find the card element to pull the correct matching image path
      const productCard = document.querySelector(`[data-id="${id}"]`);
      const imgUrl = productCard ? productCard.querySelector('img').src : "./image/logo copy.png";

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: String(id),
          title: title,
          price: parseFloat(price),
          image: imgUrl,
          quantity: 1
        });
      }

      localStorage.setItem('minee_cart', JSON.stringify(cart));
      refreshFloatingCartUI();

      // Show the cart preview dropdown panel automatically on add action
      const cartPreview = document.getElementById('cart-preview');
      if (cartPreview) cartPreview.classList.remove('hidden');
    };

    // --- REFRESH FLOATING PANEL TOTALS COMPONENT ---
    function refreshFloatingCartUI() {
      const cartItems = JSON.parse(localStorage.getItem('minee_cart')) || [];
      const totalCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
      
      const cartBtn = document.getElementById('cart-button');
      if (cartBtn) {
        cartBtn.innerHTML = `<i class="fa-solid fa-shopping-cart text-pink-400"></i> Cart (${totalCount})`;
      }

      const listContainer = document.getElementById('cart-items');
      const totalContainer = document.getElementById('cart-total');
      if (!listContainer || !totalContainer) return;

      if (cartItems.length === 0) {
        listContainer.innerHTML = `<li class="text-neutral-400 text-center py-2 text-xs italic">Your basket is empty</li>`;
        totalContainer.innerText = `Total: $0.00`;
        return;
      }

      listContainer.innerHTML = "";
      let accumulatedPrice = 0;

      cartItems.forEach(item => {
        const cost = parseFloat(item.price) || 0;
        const qty = item.quantity || 1;
        accumulatedPrice += (cost * qty);
        const itemImgUrl = item.image || item.img || "./image/logo copy.png";

        listContainer.innerHTML += `
          <li class="flex justify-between items-center bg-neutral-50 p-2 rounded-lg border border-neutral-100 text-[11px] gap-2">
            <div class="flex items-center gap-2 truncate max-w-[170px]">
              <div class="w-8 h-8 rounded-md bg-white border border-neutral-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="${itemImgUrl}" alt="${item.title}" class="w-full h-full object-contain">
              </div>
              <div class="truncate">
                <p class="font-medium text-neutral-700 truncate">${item.title}</p>
                <p class="text-[10px] text-neutral-400">Qty: ${qty}</p>
              </div>
            </div>
            <span class="font-bold text-neutral-800 shrink-0">$${(cost * qty).toFixed(2)}</span>
          </li>
        `;
      });

      totalContainer.innerText = `Total: $${accumulatedPrice.toFixed(2)}`;
    }

    // --- ROUTE TO PRODUCT DETAIL VIEWS ---
    window.viewProductDetails = function(element) {
      const card = element.closest('[data-id]');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const type = card.getAttribute('data-type');
      const ingredients = card.getAttribute('data-ingredients');
      const name = card.querySelector('p').innerText;
      const priceText = card.querySelector('.text-lg').innerText;
      const img = card.querySelector('img').src;

      const productObj = { id, name, type, price: priceText, img, ingredients };
      localStorage.setItem('selectedProduct', JSON.stringify(productObj));
      window.location.href = "product.html";
    };

    // --- REDIRECT RUNTIME CHECKOUT LINK ---
    window.confirmCart = function() {
      const cartItems = JSON.parse(localStorage.getItem('minee_cart')) || [];
      if (cartItems.length === 0) return alert("Your cart is empty!");
      window.location.href = "checkout.html";
    };

    // --- WISHLIST MANAGEMENT INFRASTRUCTURE ---
    window.toggleWishlist = function() {
      const wishlistPreview = document.getElementById('wishlist-preview');
      const cartPreview = document.getElementById('cart-preview');
      if (wishlistPreview) {
        wishlistPreview.classList.toggle('hidden');
        if (cartPreview) cartPreview.classList.add('hidden'); // Close cart if open
      }
    };

    window.toggleWishlistItem = function(id, name, price, img) {
      let wishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
      const index = wishlist.findIndex(item => String(item.id) === String(id));

      if (index > -1) {
        wishlist.splice(index, 1);
      } else {
        wishlist.push({ id: String(id), name, price: parseFloat(price), img });
      }

      localStorage.setItem("minee_wishlist", JSON.stringify(wishlist));
      syncWishlistUI();
    };

    function syncWishlistUI() {
      const wishlist = JSON.parse(localStorage.getItem("minee_wishlist")) || [];
      
      // Update badge counts inside navigation elements
      const badge = document.getElementById('wishlist-count-badge');
      if (badge) badge.innerText = wishlist.length;

      // Update structural heart color state rules globally inside grid layout variables
      document.querySelectorAll('.fa-heart[class*="id-heart-"]').forEach(heart => {
        heart.className = "fa-solid fa-heart text-neutral-300 transition-colors";
      });

      wishlist.forEach(item => {
        const activeHeart = document.querySelector(`.id-heart-${item.id}`);
        if (activeHeart) activeHeart.className = "fa-solid fa-heart text-pink-500 transition-colors";
      });

      // Populate wishlist container popup grid components
      const listContainer = document.getElementById('wishlist-items');
      if (!listContainer) return;

      if (wishlist.length === 0) {
        listContainer.innerHTML = `<li class="text-neutral-400 text-center py-2 italic">No favorites added yet</li>`;
        return;
      }

      listContainer.innerHTML = wishlist.map(item => `
        <li class="flex justify-between items-center bg-neutral-50 p-2 rounded-lg border border-neutral-100 gap-2">
          <div class="flex items-center gap-2 truncate">
            <img src="${item.img}" class="w-6 h-6 object-contain rounded bg-white border border-neutral-100 shrink-0">
            <span class="truncate font-medium">${item.name}</span>
          </div>
          <button onclick="toggleWishlistItem('${item.id}', '', 0, '')" class="text-neutral-400 hover:text-red-500 cursor-pointer shrink-0 ml-auto">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </li>
      `).join('');
    }

    // --- FETCH LIVE STOCK DATA & SALES STRAIGHT FROM DATABASE ENDPOINT ---
    async function checkLiveDatabaseStockAndDiscounts() {
      try {
        const response = await fetch('http://localhost:3000/api/products');
        if (!response.ok) return;
        const dbProducts = await response.json();

        dbProducts.forEach(prod => {
          const card = document.querySelector(`[data-id="${prod.id}"]`);
          if (!card) return;

          const currentPrice = Number(prod.price);
          const discountPrice = prod.discount_price ? Number(prod.discount_price) : null;
          const stockQuantity = prod.stock !== undefined ? parseInt(prod.stock) : 10;

          // 1. If item has a dynamic promotion discount active, inject sale price updates
          if (discountPrice && discountPrice < currentPrice) {
            const priceDiv = card.querySelector('.text-pink-600');
            if (priceDiv) {
              priceDiv.innerHTML = `
                <span class="text-neutral-400 line-through text-xs font-normal mr-2">$${currentPrice.toFixed(2)}</span>
                <span class="text-pink-600 font-extrabold">$${discountPrice.toFixed(2)}</span>
              `;
            }
            // Add custom sale flag element onto image layout view container
            card.classList.add('relative');
            card.insertAdjacentHTML('afterbegin', `<span class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md z-10 animate-pulse shadow-sm">Hot Sale</span>`);
            
            // Adjust the dynamic onclick pricing context mapping
            const btn = card.querySelector('button[onclick^="addToCart"]');
            if (btn) btn.setAttribute('onclick', `addToCart(${prod.id}, '${prod.title || prod.name}', ${discountPrice})`);
          }

          // 2. If item is Out of Stock, cleanly block action routes completely
          if (stockQuantity <= 0) {
            const imgDiv = card.querySelector('.cursor-pointer');
            if (imgDiv) {
              imgDiv.classList.add('relative', 'opacity-60');
              imgDiv.insertAdjacentHTML('beforeend', `
                <div class="absolute inset-0 flex items-center justify-center bg-neutral-900/20 rounded-xl">
                  <span class="bg-white/95 text-neutral-800 text-xs font-black px-4 py-2 rounded-lg shadow-sm border tracking-wide uppercase">Sold Out</span>              
                </div>
              `);
            }
            const actionBtn = card.querySelector('button[onclick^="addToCart"]');
            if (actionBtn) {
              actionBtn.disabled = true;
              actionBtn.innerText = "Out of Stock";
              actionBtn.className = "w-full bg-neutral-200 text-neutral-400 text-sm font-semibold py-2 px-4 rounded-xl cursor-not-allowed mt-auto shadow-none";
              actionBtn.removeAttribute('onclick');
            }
          }
        });
      } catch (err) {
        console.log("Running layout cleanly in local fallback framework mode without express.");
      }
    }