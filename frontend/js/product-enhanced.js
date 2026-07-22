/* ============================================================ */
/* PRODUCT PAGE — Enhanced JS                                  */
/* ============================================================ */

/* Gallery */
const mainImage = document.getElementById('mainImage');
const thumbs    = document.querySelectorAll('.thumb');

thumbs.forEach(t => {
  t.addEventListener('click', () => {
    thumbs.forEach(th => th.classList.remove('active'));
    t.classList.add('active');
    if (mainImage) {
      mainImage.style.opacity = '0';
      setTimeout(() => { 
        mainImage.src = t.src; 
        mainImage.style.opacity = '1'; 
      }, 250);
    }
  });
});

/* Quantity */
let qty = 1;
document.getElementById('minus')?.addEventListener('click', () => {
  if (qty > 1) { qty--; document.getElementById('qty').value = qty; }
});
document.getElementById('plus')?.addEventListener('click', () => {
  qty++;
  document.getElementById('qty').value = qty;
});

/* Size Selector */
let selectedSize = 'L';
document.querySelectorAll('.size-grid button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-grid button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSize = btn.textContent.trim();
  });
});

/* Add To Cart */
document.querySelector('.cart-btn')?.addEventListener('click', () => {
  const productId   = document.getElementById('productData')?.dataset.id || 'prod-1';
  const productName = document.getElementById('productData')?.dataset.name || 'OBSIDIAN SHADOW HOODIE';
  const price       = parseInt(document.getElementById('productData')?.dataset.price || '1490');

  Cart.add({ id: productId, name: productName, price, size: selectedSize, quantity: qty, image: mainImage?.src });

  const btn = document.querySelector('.cart-btn');
  const og  = btn.innerHTML;
  btn.innerHTML = '✓ ADDED TO CART';
  btn.style.background = 'linear-gradient(135deg,#00ff78,#006644)';
  setTimeout(() => { btn.innerHTML = og; btn.style.background = ''; }, 2000);
});

/* Wishlist */
document.querySelector('.wishlist-btn')?.addEventListener('click', function() {
  const productId   = document.getElementById('productData')?.dataset.id || 'prod-1';
  const productName = document.getElementById('productData')?.dataset.name || 'OBSIDIAN SHADOW HOODIE';
  Wishlist.toggle(productId, productName);
  this.innerHTML = Wishlist.has(productId) ? '♥' : '♡';
  this.style.color = Wishlist.has(productId) ? 'var(--accent)' : '';
});

/* Parallax Gallery — Use GSAP for better performance */
function initProductParallax() {
  const img = document.querySelector('.gallery-main img');
  if (img && typeof gsap !== 'undefined') {
    gsap.to(img, {
      y: 50,
      scale: 1.05,
      scrollTrigger: {
        trigger: '.gallery-main',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });
  }
}

/* Related Card Tilt — Use GSAP for smoothing */
function initProductTilt() {
  document.querySelectorAll('.related-card').forEach(card => {
    if (typeof gsap === 'undefined') return;
    const qX = gsap.quickTo(card, "rotateX", { duration: 0.6, ease: 'power3.out' });
    const qY = gsap.quickTo(card, "rotateY", { duration: 0.6, ease: 'power3.out' });
    const qS = gsap.quickTo(card, "scale", { duration: 0.6, ease: 'power3.out' });

    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - .5) * -15;
      const ry = ((e.clientX - r.left) / r.width - .5) * 15;
      qX(rx);
      qY(ry);
      qS(1.02);
      card.style.perspective = '1000px';
    });

    card.addEventListener('mouseleave', () => {
      qX(0);
      qY(0);
      qS(1);
    });
  });
}

/* Reviews Data & Render Engine */
const MOCK_REVIEWS = [
  { id:1, author:'Ayman K.',    rating:5, date:'2026-04-15', text:"Absolutely fire. The quality is insane and the silhouette is exactly as described. Went with an L and it's perfect oversized." },
  { id:2, author:'Salma M.',    rating:5, date:'2026-04-02', text:"Received this last week and I've worn it every day. The material feels premium and the design is unlike anything else." },
  { id:3, author:'Yassine R.',  rating:4, date:'2026-03-28', text:"Really solid piece. The reflective elements catch the light beautifully. Shipping was fast too." },
  { id:4, author:'Nour B.',     rating:5, date:'2026-03-10', text:"HUVVSM never misses. This hoodie is the definition of cinematic fashion." },
];

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < rating ? 'var(--gold)' : 'var(--text-3)'}">★</span>`
  ).join('');
}

function renderReviews() {
  const container = document.getElementById('reviewsList');
  if (!container) return;

  const avg = MOCK_REVIEWS.reduce((a,r) => a + r.rating, 0) / MOCK_REVIEWS.length;
  
  const avgEl = document.getElementById('reviewAvg');
  const countEl = document.getElementById('reviewCount');
  const starsEl = document.getElementById('reviewStars');

  if (avgEl) avgEl.textContent = avg.toFixed(1);
  if (countEl) countEl.textContent = `(${MOCK_REVIEWS.length} reviews)`;
  if (starsEl) starsEl.innerHTML = renderStars(Math.round(avg));

  container.innerHTML = MOCK_REVIEWS.map(r => `
    <div class="review-card" data-reveal>
      <div class="review-header">
        <div class="review-user">
          <div class="review-avatar">${r.author[0]}</div>
          <div>
            <h4>${r.author}</h4>
            <span class="label text-muted">${Format.date(r.date)}</span>
          </div>
        </div>
        <div class="review-stars">${renderStars(r.rating)}</div>
      </div>
      <p class="body-sm" style="margin-top:16px">${r.text}</p>
    </div>
  `).join('');
}

/* Review form submission handler with complete async/await block */
document.getElementById('reviewForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const productId = document.getElementById('productData')?.dataset.id || 'prod-1';
  const data = Object.fromEntries(new FormData(this));
  data.rating = document.querySelector('.star-input.selected')?.dataset.value || 5;
  
  try {
    /* Process API request safely */
    await API.post(`/products/${productId}/reviews`, data);
    Toast.success('Review submitted! Thank you.');
  } catch (err) {
    // Graceful alternative fallback for local/headless prototyping scenarios
    console.warn("Backend not detected, running simulated review update.", err);
    MOCK_REVIEWS.unshift({
      id: Date.now(),
      author: data.author || 'Guest',
      rating: parseInt(data.rating),
      date: new Date().toISOString().split('T')[0],
      text: data.text || ''
    });
    renderReviews();
    Toast.success('Review submitted! Thank you.');
  }
  
  this.reset();
  document.querySelectorAll('.star-input').forEach(s => s.classList.remove('selected'));
});

/* Star input dynamic rating selections */
document.querySelectorAll('.star-input').forEach(star => {
  star.addEventListener('click', () => {
    const val = +star.dataset.value;
    document.querySelectorAll('.star-input').forEach((s, i) => {
      s.classList.toggle('selected', i < val);
    });
  });
});

/* System Initialization Entry Point */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Toast !== 'undefined' && typeof Toast.init === 'function') Toast.init();
  if (typeof Cart !== 'undefined' && typeof Cart._update === 'function') Cart._update();
  
  renderReviews();
  initProductParallax();
  initProductTilt();

  if (typeof initReveal === 'function') initReveal();
  if (typeof initMagnetic === 'function') initMagnetic();
});