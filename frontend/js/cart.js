/* ============================================================ */
/* HUVVSM — CART PAGE LOGIC                                     */
/* js/cart.js                                                  */
/* ============================================================ */

async function initCart() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;

  try {
    let items = [];
    if (Auth.isLoggedIn()) {
      const res = await API.get('/cart');
      items = res.data || [];
    } else {
      items = Cart.get();
    }
    renderCart(items);
  } catch (err) {
    console.error('[CART] initCart Error:', err);
    renderCart(Cart.get());
  }
}

function renderCart(items) {
  const container = document.getElementById('cartItemsList');
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <p class="body-lg">SIGNAL_LOST: CART IS EMPTY</p>
        <a href="shop.html" class="btn btn-primary">RESTORE_INVENTORY</a>
      </div>
    `;
    updateSummary(0);
    return;
  }

  try {
    const html = items.map(item => {
      const isBackend = !!item.product;
      const p = item.product || item;

      const rawImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || item.image || '');
      const img = Format.image(rawImg);
      const name = p.name || 'SPECIMEN_UNKNOWN';
      const price = p.price || 0;
      const size = item.size || p.size || 'L';
      const qty = item.quantity || 1;
      const category = p.category || 'SIGNAL_04';
      const targetId = isBackend ? item.productId : (item.id || p.id);
      const stock = typeof p.stock === 'number' ? p.stock : null;

      const stockWarning = (stock !== null && qty >= stock)
        ? `<p class="cart-stock-warning">⚠ Only ${stock} in stock</p>`
        : '';

      const atMaxStock = stock !== null && qty >= stock;

      return `
        <div class="cart-item glass" data-id="${item.id}" data-product-id="${targetId}" data-size="${size}">
          <div class="cart-item-img">
            <img src="${img}" alt="${name}" onerror="this.src='https://via.placeholder.com/150/05060a/00e5ff?text=SIGNAL_LOST'">
          </div>
          <div class="cart-item-info">
            <div class="cart-item-header">
              <div>
                <span class="label text-muted">${category.toUpperCase()}</span>
                <h3>${name}</h3>
                <p class="label">SIZE: ${size}</p>
                ${stockWarning}
              </div>
              <div class="price-display">${Format.price(price)}</div>
            </div>
            <div class="cart-item-actions">
              <div class="qty-stepper sm">
                <button onclick="handleQty('${targetId}', '${size}', -1)">-</button>
                <span>${qty}</span>
                <button onclick="handleQty('${targetId}', '${size}', 1)" ${atMaxStock ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>+</button>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="handleRemove('${targetId}', '${size}')">REMOVE_ENTITY</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    const subtotal = items.reduce((acc, i) => {
      const price = i.product?.price || i.price || 0;
      const qty = i.quantity || 0;
      return acc + (price * qty);
    }, 0);

    updateSummary(subtotal);

  } catch (err) {
    console.error('[CART] renderCart Loop Error:', err);
    container.innerHTML = `<p class="text-error">RENDER_FAILED: Data Mismatch</p>`;
  }
}

function updateSummary(subtotal) {
  const shipping = subtotal > 0 ? 10 : 0;
  const tax = subtotal * 0;
  const total = subtotal + shipping + tax;

  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (subtotalEl) subtotalEl.textContent = Format.price(subtotal);
  if (shippingEl) shippingEl.textContent = Format.price(shipping);
  if (taxEl) taxEl.textContent = Format.price(tax);
  if (totalEl) totalEl.textContent = Format.price(total);
  if (checkoutBtn) checkoutBtn.disabled = subtotal === 0;
}

async function handleQty(productId, size, delta) {
  if (Auth.isLoggedIn()) {
    try {
      await API.post('/cart', { productId, quantity: delta, size });
      initCart();
    } catch (err) {
      Toast.error(err.error || err.message || 'Failed to update quantity');
      initCart(); // re-sync with real stock-limited state
    }
  } else {
    const current = Cart.get().find(i => i.id === productId && i.size === size);
    if (current) {
      Cart.updateQty(productId, size, current.quantity + delta);
      initCart();
    }
  }
}

async function handleRemove(productId, size) {
  if (Auth.isLoggedIn()) {
    try {
      const res = await API.get('/cart');
      const item = res.data.find(i => i.productId === productId && i.size === size);
      if (item) {
        await API.delete(`/cart/${item.id}`);
        initCart();
      }
    } catch (err) {
      Toast.error('Failed to remove item');
    }
  } else {
    Cart.remove(productId, size);
    initCart();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCart();
});