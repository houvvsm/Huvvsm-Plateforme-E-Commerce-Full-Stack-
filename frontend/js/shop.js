/* ============================================================ */
/* HUVVSM — CATALOGUE PAGE LOGIC                                */
/* js/shop.js                                                  */
/* ============================================================ */

async function fetchProducts() {
  try {
    const res = await API.get('/products');
    if (res.success) return res.data;
    return [];
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

function stockBadgeHtml(stock) {
  if (stock <= 0) {
    return `<span class="stock-badge badge-out-of-stock">✕ OUT_OF_STOCK</span>`;
  } else if (stock <= 5) {
    return `<span class="stock-badge badge-low-stock">⚠ LAST_${stock}</span>`;
  }
  return `<span class="stock-badge badge-in-stock">✓ IN_STOCK</span>`;
}

function specimenCardHtml(p) {
  const rawImg = (p.images && p.images[0]) ? p.images[0] : '';
  const mainImg = Format.image(rawImg);
  const stock = typeof p.stock === 'number' ? p.stock : 0;
  const outOfStock = stock <= 0;

  return `
    <article class="specimen-card ${outOfStock ? 'is-out-of-stock' : ''}" data-reveal data-tilt>
      <div class="specimen-card-visual">
        <img src="${mainImg}" alt="${p.name}">
        <div class="specimen-badge-container">
          ${p.tag ? `<span class="badge ${p.tag === 'LIMITED' ? 'badge-hot' : 'badge-rare'}">${p.tag}</span>` : ''}
          ${stockBadgeHtml(stock)}
        </div>
        <div class="specimen-shutter">
          <div class="shutter-actions">
            <button class="btn btn-primary btn-sm" onclick="window.location='product.html?id=${p.id}'">VIEW SPECIMEN</button>
            <button class="btn btn-ghost btn-sm" ${outOfStock ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}
              onclick="handleAddToCart('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${mainImg}')">
              ${outOfStock ? 'UNAVAILABLE' : 'ADD TO CORE'}
            </button>
          </div>
        </div>
      </div>
      <div class="specimen-details">
        <div class="specimen-meta">
          <span class="specimen-id">REF_${p.id.slice(0,8).toUpperCase()} // ${p.category.toUpperCase()}</span>
          <button class="btn btn-ghost btn-icon" onclick="handleWishlistToggle('${p.id}','${p.name.replace(/'/g, "\\'")}')" data-wishlist-btn data-product-id="${p.id}">♡</button>
        </div>
        <h3 class="specimen-title">${p.name}</h3>
        <div class="price-display">
          <span class="price-current">${Format.price(p.price)}</span>
        </div>
      </div>
    </article>
  `;
}

async function renderProducts(filter = 'all') {
  const grid = document.getElementById('catalogueGrid');
  if (!grid) return;

  const products = await fetchProducts();
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p class="label">NO_SPECIMENS_FOUND</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(specimenCardHtml).join('');

  if (typeof initReveal === 'function') initReveal();
  if (typeof initTilt === 'function') initTilt();
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  syncWishlistButtons();
}

async function handleAddToCart(id, name, price, image) {
  if (Auth.isLoggedIn()) {
    try {
      await API.post('/cart', { productId: id, quantity: 1, size: 'L' });
      Toast.success(`${name} added to core database`);
      Cart._update();
    } catch (err) {
      Toast.error(err.error || err.message || 'Failed to update cart');
      // Refresh grid in case stock changed
      const activeTag = document.querySelector('.tag-trigger.active');
      renderProducts(activeTag ? activeTag.dataset.filter : 'all');
    }
  } else {
    Cart.add({ id, name, price, image, size: 'L' });
  }
}

async function handleWishlistToggle(id, name) {
  if (Auth.isLoggedIn()) {
    try {
      await API.post(`/wishlist/${id}`);
      syncWishlistButtons();
    } catch (err) {
      Toast.error('Failed to update wishlist');
    }
  } else {
    Wishlist.toggle(id, name);
  }
}

async function syncWishlistButtons() {
  let activeIds = [];
  if (Auth.isLoggedIn()) {
    try {
      const res = await API.get('/wishlist');
      activeIds = res.data.map(item => item.productId);
    } catch (err) {}
  } else {
    activeIds = Wishlist.get();
  }

  document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
    const id = btn.dataset.productId;
    btn.classList.toggle('active', activeIds.includes(id));
    btn.innerHTML = activeIds.includes(id) ? '♥' : '♡';
  });
}

function initFilters() {
  const triggers = document.querySelectorAll('.tag-trigger');
  triggers.forEach(btn => {
    btn.addEventListener('click', () => {
      triggers.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.filter);
    });
  });
}

async function initSearch() {
  const searchInput = document.querySelector('.search-terminal-box input');
  if (!searchInput) return;

  const products = await fetchProducts();

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );

    const grid = document.getElementById('catalogueGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state"><p class="label">NO_SPECIMENS_FOUND</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map(specimenCardHtml).join('');

    if (typeof initReveal === 'function') initReveal();
    if (typeof initTilt === 'function') initTilt();
    syncWishlistButtons();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  initFilters();
  initSearch();
});