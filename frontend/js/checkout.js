/* ============================================================ */
/* HUVVSM — CHECKOUT PAGE LOGIC                                 */
/* js/checkout.js                                               */
/* ============================================================ */

let _currentSubtotal = 0;
let _availableCoupons = [];
let _selectedCouponId = '';

async function initCheckout() {
  console.log('[CHECKOUT] Initializing...');

  // Redirect to login if not authenticated
  if (!Auth.isLoggedIn()) {
    Toast.error('SESSION_REQUIRED: Please login first');
    setTimeout(() => window.location.href = 'auth.html', 1500);
    return;
  }

  // Pre-fill user data
  const user = Auth.getUser();
  if (user) {
    const nameEl  = document.getElementById('userName');
    const emailEl = document.getElementById('checkoutEmail');
    if (nameEl)  nameEl.value  = user.name  || '';
    if (emailEl) emailEl.value = user.email || '';
  }

  // Load cart into summary
  await loadSummary();

  // Load customer rewards coupons
  await loadCoupons();

  // Wire up listeners
  setupPaymentToggle();
  setupFormSubmit();
  setupCouponListener();

  // Reveal animations
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('revealed');
      el.removeAttribute('data-reveal');
    });
  }, 100);
}

/* ── LOAD CART INTO SIDEBAR SUMMARY ── */
async function loadSummary() {
  const summaryItems = document.getElementById('summaryItems');
  if (!summaryItems) return;

  let items = [];
  try {
    const res = await API.get('/cart');
    items = res.data || [];
  } catch (e) {
    items = Cart.get();
  }

  if (!items || items.length === 0) {
    summaryItems.innerHTML = `<p style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:0.1em;">CART_EMPTY</p>`;
    _currentSubtotal = 0;
    updateTotals();
    // Disable submit
    const btn = document.getElementById('completeOrderBtn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; }
    return;
  }

  summaryItems.innerHTML = items.map(item => {
    const p = item.product || item;
    const rawImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || '');
    const img = Format.image(rawImg);
    const name = p.name || 'UNKNOWN';
    const price = p.price || 0;
    const qty = item.quantity || 1;
    const size = item.size || p.size || '';

    return `
      <div class="summary-item">
        <img class="summary-item-img"
          src="${img}" alt="${name}"
          onerror="this.src='https://via.placeholder.com/52/05060a/00e5ff?text=NFD'">
        <div class="summary-item-info">
          <div class="summary-item-name">${name}</div>
          <div class="summary-item-meta">SIZE: ${size} &nbsp;·&nbsp; QTY: ${qty}</div>
        </div>
        <div class="summary-item-price">${Format.price(price * qty)}</div>
      </div>`;
  }).join('');

  _currentSubtotal = items.reduce((acc, i) => {
    const price = i.product?.price || i.price || 0;
    return acc + price * (i.quantity || 1);
  }, 0);

  updateTotals();
}

/* ── FETCH & RENDER ACTIVE COUPONS ── */
async function loadCoupons() {
  const couponSelect = document.getElementById('checkoutCoupon');
  if (!couponSelect) return;

  try {
    const res = await API.get('/rewards/my');
    _availableCoupons = res.data.coupons || [];

    if (_availableCoupons.length === 0) {
      couponSelect.innerHTML = `<option value="">NO_COUPONS_AVAILABLE</option>`;
      couponSelect.disabled = true;
      return;
    }

    couponSelect.disabled = false;
    couponSelect.innerHTML = `<option value="">SELECT_REWARD_COUPON</option>` + 
      _availableCoupons.map(c => `
        <option value="${c.id}">${c.code} (${c.discountPercent}% OFF) — Exp. ${new Date(c.expiresAt).toLocaleDateString()}</option>
      `).join('');
  } catch (err) {
    console.error('[COUPONS LOAD ERROR]', err);
    couponSelect.innerHTML = `<option value="">FAILED_TO_LOAD_COUPONS</option>`;
    couponSelect.disabled = true;
  }
}

/* ── COUPON INPUT CHANGE LISTENER ── */
function setupCouponListener() {
  const couponSelect = document.getElementById('checkoutCoupon');
  if (couponSelect) {
    couponSelect.addEventListener('change', (e) => {
      _selectedCouponId = e.target.value;
      updateTotals();
    });
  }
}

function updateTotals() {
  const subtotal = _currentSubtotal;
  let discount = 0;

  if (_selectedCouponId) {
    const activeCoupon = _availableCoupons.find(c => c.id === _selectedCouponId);
    if (activeCoupon) {
      discount = subtotal * (activeCoupon.discountPercent / 100);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping = subtotal > 0 ? 10 : 0;
  const tax = discountedSubtotal * 0;
  const total = discountedSubtotal + shipping + tax;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Format.price(val);
  };

  const discountRow = document.getElementById('discountRow');
  const summaryDiscount = document.getElementById('summaryDiscount');

  if (discount > 0) {
    if (discountRow) discountRow.style.display = 'flex';
    if (summaryDiscount) summaryDiscount.textContent = `-${Format.price(discount)}`;
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }

  set('summarySubtotal', subtotal);
  set('summaryShipping', shipping);
  set('summaryTax', tax);
  set('finalTotal', total);
}

/* ── PAYMENT METHOD TOGGLE ── */
function setupPaymentToggle() {
  document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const cardInfo     = document.getElementById('cardInfo');
      const virementInfo = document.getElementById('virementInfo');
      if (cardInfo)     cardInfo.style.display     = radio.value === 'card'      ? 'block' : 'none';
      if (virementInfo) virementInfo.style.display = radio.value === 'virement'  ? 'block' : 'none';
    });
  });
}

/* ── FORM SUBMIT ── */
function setupFormSubmit() {
  const form = document.getElementById('checkoutForm');
  if (form) form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('completeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> AUTHORIZING_TRANSMISSION...';

  const address       = document.getElementById('address').value.trim();
  const city          = document.getElementById('city').value;
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value;

  if (!address || !city) {
    Toast.error('MISSING_DESTINATION_PARAMETERS');
    resetBtn(btn);
    return;
  }

  const payload = { address, city, paymentMethod };
  if (_selectedCouponId) {
    payload.couponId = _selectedCouponId;
  }

  try {
    await API.post('/orders', payload);
    showSuccessOverlay();
  } catch (err) {
    console.error('[CHECKOUT ERROR]', err);
    Toast.error(err.error || err.message || 'TRANSMISSION_FAILED');
    resetBtn(btn);
  }
}

function resetBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = 'AUTHORIZE_SIGNAL_TRANSMISSION';
}

/* ── SUCCESS OVERLAY WITH COUNTDOWN ── */
function showSuccessOverlay() {
  const overlay = document.getElementById('successOverlay');
  const countEl = document.getElementById('countdownVal');
  if (!overlay) {
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }

  overlay.classList.add('visible');

  let count = 3;
  const tick = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(tick);
      window.location.href = 'index.html';
    }
  }, 1000);
}

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', initCheckout);