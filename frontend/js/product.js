/* ============================================================ */
/* HUVVSM — PRODUCT DETAIL LOGIC                                */
/* js/product.js                                               */
/* ============================================================ */

let _currentProduct = null;

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'shop.html';
    return;
  }

  try {
    const res = await API.get(`/products/${productId}`);
    if (res.success) {
      _currentProduct = res.data;
      renderProduct(res.data);
    } else {
      window.location.href = 'shop.html';
    }
  } catch (err) {
    console.error('Failed to load product:', err);
    window.location.href = 'shop.html';
  }
}

/* ── STOCK STATUS RENDERER ── */
function renderStockStatus(stock) {
  const stockEl = document.querySelector('.price-status');
  const addBtn  = document.getElementById('addToCartBtn');
  if (!stockEl) return;

  stockEl.classList.remove('stock-high', 'stock-low', 'stock-out');

  if (stock > 10) {
    stockEl.textContent = `✓ IN_STOCK (${stock})`;
    stockEl.classList.add('stock-high');
  } else if (stock >= 1) {
    stockEl.textContent = `⚠ ONLY_${stock}_LEFT`;
    stockEl.classList.add('stock-low');
  } else {
    stockEl.textContent = `✕ OUT_OF_STOCK`;
    stockEl.classList.add('stock-out');
  }

  if (addBtn) {
    if (stock <= 0) {
      addBtn.disabled = true;
      addBtn.classList.add('btn-disabled');
      addBtn.innerHTML = 'OUT_OF_STOCK';
    } else {
      addBtn.disabled = false;
      addBtn.classList.remove('btn-disabled');
      addBtn.innerHTML = `ADD_TO_CART
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }
  }
}

function renderProduct(p) {
  document.title = `${p.name} // HUVVSM DIGITAL FASHION`;
  document.getElementById('breadcrumbName').textContent = p.name;

  const mainImage = document.getElementById('productImage');
  mainImage.src = Format.image(p.images[0] || '');

  // Thumbnails
  const thumbContainer = document.getElementById('productThumbnails');
  if (thumbContainer && p.images.length > 1) {
    thumbContainer.innerHTML = p.images.map((img, idx) => `
      <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchView(${idx})">
        <img src="${Format.image(img)}" alt="Thumbnail ${idx + 1}">
      </div>
    `).join('');

    window.switchView = (index) => {
      mainImage.src = Format.image(p.images[index]);
      document.querySelectorAll('.thumb-item').forEach((d, i) => d.classList.toggle('active', i === index));
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(mainImage, { opacity: 0.5, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
      }
    };
  }

  document.getElementById('productCategory').textContent = `// CATEGORY: ${p.category.toUpperCase()}`;
  document.getElementById('productName').textContent = p.name;
  document.getElementById('productPrice').textContent = Format.price(p.price);
  document.getElementById('productDesc').textContent = p.description;

  // ── DYNAMIC STOCK ──
  renderStockStatus(typeof p.stock === 'number' ? p.stock : 0);

  // ── AVERAGE RATING ──
  renderAverageRating(p.id);

  const qtyInput = document.getElementById('qtyInput');
  const qtyUp = document.getElementById('qtyUp');
  const qtyDown = document.getElementById('qtyDown');

  if (qtyUp && qtyDown && qtyInput) {
    qtyInput.max = p.stock;
    qtyUp.addEventListener('click', () => {
      const next = parseInt(qtyInput.value) + 1;
      if (next > p.stock) {
        Toast.error(`Only ${p.stock} unit(s) available`);
        return;
      }
      qtyInput.value = next;
    });
    qtyDown.addEventListener('click', () => {
      if (qtyInput.value > 1) qtyInput.value--;
    });
  }

  // ── SIZE BUTTONS — Dynamic from sizeStock ──
  const sizeOptionsEl = document.getElementById('sizeOptions');
  const defaultSizes  = ['S', 'M', 'L', 'XL'];
  const sizeStock     = p.sizeStock && typeof p.sizeStock === 'object' ? p.sizeStock : null;
  const sizesToRender = sizeStock ? Object.keys(sizeStock) : defaultSizes;

  if (sizeOptionsEl) {
    sizeOptionsEl.innerHTML = sizesToRender.map((sz, idx) => {
      const qty   = sizeStock ? (sizeStock[sz] || 0) : (p.stock > 0 ? 99 : 0);
      const isOos = qty <= 0;
      return `<button
        class="size-btn${isOos ? ' size-btn--oos' : ''}${idx === 0 && !isOos ? ' active' : ''}"
        data-size="${sz}"
        data-qty="${qty}"
        ${isOos ? 'disabled title="OUT_OF_STOCK"' : ''}
      >${sz}</button>`;
    }).join('');

    // Find first available and make active
    const firstAvail = sizeOptionsEl.querySelector('.size-btn:not(.size-btn--oos)');
    if (firstAvail) {
      sizeOptionsEl.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      firstAvail.classList.add('active');
    }

    sizeOptionsEl.addEventListener('click', e => {
      const btn = e.target.closest('.size-btn');
      if (!btn || btn.disabled) return;
      sizeOptionsEl.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  // Add to Cart
  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (_currentProduct.stock <= 0) {
        Toast.error('This item is out of stock');
        return;
      }

      const activeSizeEl  = document.querySelector('.size-btn.active');
      const activeSize     = activeSizeEl ? activeSizeEl.dataset.size || activeSizeEl.textContent.trim() : 'L';
      const activeSizeQty  = activeSizeEl ? parseInt(activeSizeEl.dataset.qty || 99) : _currentProduct.stock;
      const qty            = parseInt(qtyInput ? qtyInput.value : 1) || 1;

      if (activeSizeQty <= 0) {
        Toast.error('This size is out of stock');
        return;
      }

      if (qty > activeSizeQty) {
        Toast.error(`Only ${activeSizeQty} unit(s) available in size ${activeSize}`);
        return;
      }

      addBtn.disabled = true;

      try {
        if (Auth.isLoggedIn()) {
          await API.post('/cart', { productId: p.id, quantity: qty, size: activeSize });
          Toast.success(`${p.name} added to cart`);
          Cart._update();
        } else {
          Cart.add({
            id: p.id,
            name: p.name,
            price: p.price,
            size: activeSize,
            quantity: qty,
            image: p.images && p.images.length > 0 ? p.images[0] : ''
          });
        }

        // Refresh stock display after successful add (in case stock is near depleted)
        const refreshed = await API.get(`/products/${p.id}`);
        if (refreshed.success) {
          _currentProduct = refreshed.data;
          renderStockStatus(refreshed.data.stock);
        }
      } catch (err) {
        console.error('Add to Cart Error:', err);
        const errorMsg = err.error || err.message || 'Add to cart failed';
        Toast.error(errorMsg);

        // Re-sync stock display in case of a stock conflict
        try {
          const refreshed = await API.get(`/products/${p.id}`);
          if (refreshed.success) {
            _currentProduct = refreshed.data;
            renderStockStatus(refreshed.data.stock);
          }
        } catch (_) {}
      } finally {
        if (_currentProduct.stock > 0) addBtn.disabled = false;
      }
    });
  }

  // Wishlist Toggle
  const wishlistBtn = document.getElementById('wishlistBtn');
  if (wishlistBtn) {
    syncWishlistState(p.id);

    wishlistBtn.addEventListener('click', async function() {
      if (Auth.isLoggedIn()) {
        try {
          await API.post(`/wishlist/${p.id}`);
          syncWishlistState(p.id);
        } catch (err) {
          Toast.error('Failed to update wishlist');
        }
      } else {
        Wishlist.toggle(p.id, p.name);
        this.classList.toggle('active', Wishlist.has(p.id));
      }
    });
  }
}

async function renderAverageRating(productId) {
  try {
    const res = await API.get(`/products/${productId}/reviews`);
    const reviews = res.data || [];

    const ratingEl = document.getElementById('productRating');
    if (!ratingEl) return;

    if (reviews.length === 0) {
      ratingEl.innerHTML = `<span class="rating-none">NO_RATINGS_YET</span>`;
      return;
    }

    const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    const rounded = Math.round(avg * 10) / 10;
    const fullStars = Math.floor(rounded);
    const hasHalf = rounded - fullStars >= 0.5;

    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) starsHtml += `<span class="star star-full">★</span>`;
      else if (i === fullStars + 1 && hasHalf) starsHtml += `<span class="star star-half">★</span>`;
      else starsHtml += `<span class="star star-empty">★</span>`;
    }

    ratingEl.innerHTML = `
      <div class="rating-stars">${starsHtml}</div>
      <span class="rating-score">${rounded.toFixed(1)}</span>
      <span class="rating-count">(${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})</span>
    `;
  } catch (err) {
    // Silently fail — rating is non-critical
    console.warn('[RATING] Could not load reviews:', err.message);
  }
}

async function syncWishlistState(id) {
  const btn = document.getElementById('wishlistBtn');
  if (!btn) return;

  if (Auth.isLoggedIn()) {
    try {
      const res = await API.get('/wishlist');
      const isActive = res.data.some(item => item.productId === id);
      btn.classList.toggle('active', isActive);
      btn.innerHTML = isActive ? '♥' : '♡';
    } catch (err) {}
  } else {
    btn.classList.toggle('active', Wishlist.has(id));
    btn.innerHTML = Wishlist.has(id) ? '♥' : '♡';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
});