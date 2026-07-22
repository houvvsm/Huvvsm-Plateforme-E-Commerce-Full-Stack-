/* ============================================================ */
/* HUVVSM — HOME PAGE LOGIC                                     */
/* js/index.js                                                 */
/* ============================================================ */

/* COUNTDOWN SYSTEM */
function initCountdown() {
  const dropTarget = new Date('2026-08-01T00:00:00');
  const el = document.getElementById('heroCountdown');
  if (!el) return;

  function update() {
    const diff = dropTarget - new Date();
    if (diff <= 0) {
      el.textContent = "00:00:00";
      return;
    }
    const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  }
  
  setInterval(update, 1000);
  update();
}

/* ORB PARALLAX */
function initOrbParallax() {
  const orbs = document.querySelectorAll('.orb');
  if (!orbs.length) return;

  const quickToOrbs = Array.from(orbs).map((orb, i) => {
    return {
      x: gsap.quickTo(orb, "x", { duration: (i + 1) * 0.8, ease: 'power2.out' }),
      y: gsap.quickTo(orb, "y", { duration: (i + 1) * 0.8, ease: 'power2.out' }),
      s: (i + 1) * 22
    };
  });

  window.addEventListener('huvvsm:mousemove', e => {
    const { x, y } = e.detail;
    const nx = x / window.innerWidth;
    const ny = y / window.innerHeight;
    quickToOrbs.forEach(q => {
      q.x(nx * q.s);
      q.y(ny * q.s);
    });
  });
}

/* HERO ENTRANCE & PARALLAX */
function initHeroEntrance() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.2 } });
  
  tl.to('.hero-pill',       { opacity: 1, y: 0, delay: 0.2 })
    .to('.hero-line',       { opacity: 1, y: 0, stagger: 0.15 }, "-=1")
    .to('.hero-desc',       { opacity: 1, y: 0 }, "-=1")
    .to('.hero-actions',    { opacity: 1, y: 0 }, "-=1")
    .to('.hero-right',      { opacity: 1, scale: 1, duration: 1.8, ease: "expo.out" }, "-=1.4")
    .to('.float-card',      { opacity: 1, y: 0, stagger: 0.1 }, "-=1.2");

  const coreQuickX = gsap.quickTo('.core-system', "x", { duration: 1.5, ease: 'power2.out' });
  const coreQuickY = gsap.quickTo('.core-system', "y", { duration: 1.5, ease: 'power2.out' });
  const heroLeftX = gsap.quickTo('.hero-left', "x", { duration: 1.5, ease: 'power2.out' });
  const heroLeftY = gsap.quickTo('.hero-left', "y", { duration: 1.5, ease: 'power2.out' });

  window.addEventListener('huvvsm:mousemove', e => {
    const { x, y } = e.detail;
    const dx = (x - window.innerWidth / 2) * 0.01;
    const dy = (y - window.innerHeight / 2) * 0.01;
    coreQuickX(dx * 2);
    coreQuickY(dy * 2);
    heroLeftX(-dx);
    heroLeftY(-dy);
  });
}

/* NEWSLETTER */
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('newsletterBtn');
    const success = document.getElementById('newsletterSuccess');
    if (!btn || !success) return;

    btn.innerHTML = '<div class="spinner"></div> CONNECTING…';
    btn.disabled = true;
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 900));
    
    btn.classList.add('hidden');
    success.classList.remove('hidden');
    if (typeof Toast !== 'undefined') Toast.success('You\'re in the signal!');
  });
}

/* SIGNAL FEEDBACK — REAL USER REVIEWS */
async function initFeedback() {
  const container = document.getElementById('feedbackContainer');
  if (!container) return;

  try {
    const res = await API.get('/reviews?limit=10');
    const reviews = res.data || [];

    if (reviews.length === 0) {
      container.innerHTML = `
        <div class="feedback-empty">
          <p>NO_TRANSMISSIONS_YET: BE THE FIRST TO LEAVE A SIGNAL</p>
        </div>`;
      return;
    }

    const cardsHtml = reviews.map(r => {
      const name = r.user?.name || 'ANONYMOUS_ENTITY';
      const initial = name.charAt(0).toUpperCase();
      const productName = r.product?.name || 'UNKNOWN_SPECIMEN';
      const comment = r.comment || 'No written transmission provided.';

      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += i <= r.rating ? '★' : '<span class="star-empty">★</span>';
      }

      return `
        <div class="feedback-card">
          <div class="feedback-stars">${stars}</div>
          <p class="feedback-comment">${escapeHtml(comment)}</p>
          <div class="feedback-footer">
            <div class="feedback-avatar">${initial}</div>
            <div class="feedback-meta">
              <span class="feedback-name">${escapeHtml(name)}</span>
              <span class="feedback-product">${escapeHtml(productName).toUpperCase()}</span>
            </div>
            <span class="feedback-verified">
              <span class="feedback-verified-dot"></span>VERIFIED
            </span>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="feedback-grid">${cardsHtml}</div>`;

    // Initialize interactive hover effects
    initFeedbackInteractivity();

  } catch (err) {
    console.error('[FEEDBACK FETCH ERROR]', err);
    container.innerHTML = `
      <div class="feedback-empty">
        <p>SIGNAL_FETCH_FAILED: TRANSMISSIONS_OFFLINE</p>
      </div>`;
  }
}

function initFeedbackInteractivity() {
  const cards = document.querySelectorAll('.feedback-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* FEATURED PIECES — REAL DATA */
async function initFeaturedPieces() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  try {
    const res = await API.get('/products');
    let products = res.data || [];
    
    // Take first 3 products for featured
    products = products.slice(0, 3);

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="feedback-empty" style="grid-column: 1 / -1; width: 100%; text-align: center;">
          <p>NO_PIECES_FOUND: ARCHIVE_EMPTY</p>
        </div>`;
      return;
    }

    const [p1, p2, p3] = products;

    let html = '';

    // Large Card (p1)
    if (p1) {
      const mainImg = Format.image(p1.images?.[0] || '');
      html += `
      <article class="featured-card featured-large" data-reveal data-tilt>
        <div class="card-glow"></div>
        <div class="featured-card-image">
          <img src="${mainImg}" alt="${p1.name}">
          <div class="featured-card-overlay">
            <div class="featured-card-actions">
              <a href="product.html?id=${p1.id}" class="btn btn-primary btn-sm" data-magnetic>VIEW PIECE</a>
              <button class="btn btn-ghost btn-sm" data-magnetic onclick="handleHomeAddToCart('${p1.id}', '${p1.name}', ${p1.price}, '${mainImg}')">ADD TO CART</button>
            </div>
          </div>
        </div>
        <div class="featured-card-body">
          <div class="featured-card-meta">
            <span class="product-card-category">${p1.category.toUpperCase()} // ${p1.tag || 'CORE'}</span>
            ${p1.tag ? `<span class="badge ${p1.tag === 'LIMITED' ? 'badge-hot' : 'badge-rare'}">${p1.tag}</span>` : ''}
          </div>
          <h3 class="featured-card-title">${p1.name}</h3>
          <div class="featured-card-footer">
            <div class="price-display">
              <span class="price-current" style="font-size:1.8rem">${Format.price(p1.price)}</span>
            </div>
            <button class="btn btn-ghost btn-icon" onclick="handleHomeWishlistToggle('${p1.id}', '${p1.name}')" data-wishlist-btn data-product-id="${p1.id}" data-magnetic>♡</button>
          </div>
        </div>
      </article>`;
    }

    // Small Cards Column
    if (p2 || p3) {
      html += `<div class="featured-right-col">`;
      
      [p2, p3].filter(Boolean).forEach((p, idx) => {
        const mainImg = Format.image(p.images?.[0] || '');
        html += `
        <article class="featured-card" data-reveal data-reveal-delay="${idx + 1}" data-tilt>
          <div class="card-glow"></div>
          <div class="featured-card-image featured-card-image-sm">
            <img src="${mainImg}" alt="${p.name}">
            <div class="featured-card-overlay">
              <div class="featured-card-actions">
                <a href="product.html?id=${p.id}" class="btn btn-primary btn-sm" data-magnetic>VIEW PIECE</a>
                <button class="btn btn-ghost btn-sm" data-magnetic onclick="handleHomeAddToCart('${p.id}', '${p.name}', ${p.price}, '${mainImg}')">ADD</button>
              </div>
            </div>
          </div>
          <div class="featured-card-body">
            <div class="featured-card-meta">
              <span class="product-card-category">${p.category.toUpperCase()}</span>
              ${p.tag ? `<span class="badge badge-live">${p.tag}</span>` : ''}
            </div>
            <h3 class="featured-card-title" style="font-size:1.6rem">${p.name}</h3>
            <div class="featured-card-footer">
              <span class="price-current" style="font-size:1.4rem">${Format.price(p.price)}</span>
              <button class="btn btn-ghost btn-icon" onclick="handleHomeWishlistToggle('${p.id}', '${p.name}')" data-wishlist-btn data-product-id="${p.id}" data-magnetic>♡</button>
            </div>
          </div>
        </article>`;
      });

      html += `</div>`;
    }

    grid.innerHTML = html;

    // Refresh animations/tilt
    if (typeof initReveal === 'function') initReveal();
    if (typeof initTilt === 'function') initTilt();
    syncHomeWishlist();

  } catch (err) {
    console.error('[FEATURED FETCH ERROR]', err);
    grid.innerHTML = `<div class="feedback-empty" style="grid-column:1/-1;text-align:center"><p>SIGNAL_OFFLINE</p></div>`;
  }
}

async function handleHomeAddToCart(id, name, price, image) {
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    try {
      await API.post('/cart', { productId: id, quantity: 1, size: 'L' });
      Toast.success(`${name} added to core database`);
      if (typeof Cart !== 'undefined') Cart._update();
    } catch (err) {
      Toast.error('Failed to update cart');
    }
  } else if (typeof Cart !== 'undefined') {
    Cart.add({ id, name, price, image, size: 'L' });
  }
}

async function handleHomeWishlistToggle(id, name) {
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    try {
      await API.post(`/wishlist/${id}`);
      syncHomeWishlist();
    } catch (err) {
      Toast.error('Failed to update wishlist');
    }
  } else if (typeof Wishlist !== 'undefined') {
    Wishlist.toggle(id, name);
    syncHomeWishlist();
  }
}

async function syncHomeWishlist() {
  let activeIds = [];
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    try {
      const res = await API.get('/wishlist');
      activeIds = res.data.map(item => item.productId);
    } catch (err) {}
  } else if (typeof Wishlist !== 'undefined') {
    activeIds = Wishlist.get();
  }

  document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
    const id = btn.dataset.productId;
    const active = activeIds.includes(id);
    btn.classList.toggle('active', active);
    btn.innerHTML = active ? '♥' : '♡';
  });
}

// Global entrance trigger
window.HUVVSM_ENTRANCE = initHeroEntrance;

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initOrbParallax();
  initNewsletter();
  initFeedback();
  initFeaturedPieces();
});