/* ============================================================ */
/* HUVVSM — LOOKBOOK PAGE LOGIC — UPGRADED                      */
/* js/lookbook.js                                               */
/* ============================================================ */

async function initLookbook() {
  console.log('[LOOKBOOK] Initializing...');

  // SAFETY NET: force-reveal hero content if GSAP/loader chain fails for any reason
  setTimeout(() => {
    document.querySelectorAll('.hero-eyebrow, .hero-title, .hero-title .line-inner, .hero-meta, .scroll-indicator')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
  }, 2500);

  if (typeof gsap === 'undefined') {
    // No GSAP at all — reveal immediately, skip all animation logic below
    document.querySelectorAll('.hero-eyebrow, .hero-title, .hero-title .line-inner, .hero-meta, .scroll-indicator')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
  } else {
    // Hero entrance — hooked into global loader
    window.HUVVSM_ENTRANCE = () => {
      gsap.to('.hero-title .line-inner', {
        y: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power4.out'
      });
    };

    // Only hide the title lines — eyebrow/meta/scroll always visible
    gsap.set('.hero-title .line-inner', { y: '110%', opacity: 0 });
  }

  // Fetch products and render
  try {
    const res = await API.get('/products');
    const products = res.data || [];
    if (products.length > 0) {
      renderDynamicContent(products);
    } else {
      renderEmptyState();
    }
  } catch (err) {
    console.error('[LOOKBOOK ERROR]', err);
    renderEmptyState();
  }

  initScrollAnimations();
}

/* ── RENDER STORIES + GALLERY ── */
function renderDynamicContent(products) {
  renderStories(products.slice(0, 3));
  renderGallery(products);

  setTimeout(() => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    initScrollAnimations();
  }, 150);
}

function renderStories(products) {
  const container = document.getElementById('dynamic-stories');
  if (!container) return;

  container.innerHTML = products.map((p, i) => {
    const isAlt = i % 2 !== 0;
    const img = (p.images && p.images.length > 0) ? Format.image(p.images[0]) : null;
    const placeholder = !img ? 'brand-placeholder-gradient' : '';

    const imageBlock = `
      <div class="story-image-wrap ${placeholder}">
        ${img
          ? `<img src="${img}" alt="${p.name}" class="story-img">`
          : `<div class="placeholder-icon">HUVVSM_SIGNAL</div>`
        }
      </div>`;

    const contentBlock = `
      <div class="story-content">
        <div class="story-index">0${i + 1}</div>
        <div class="story-label">${p.category || 'SIGNAL'}</div>
        <h3 class="story-title">${p.name.toUpperCase()}</h3>
        <p class="story-desc">${p.description || 'No technical specification provided for this identity unit.'}</p>
        <a href="shop.html" class="story-cta">
          VIEW_SPECIMEN
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>`;

    return `
      <div class="story-block ${isAlt ? 'alternate-2' : 'alternate-1'}">
        ${isAlt ? contentBlock + imageBlock : imageBlock + contentBlock}
      </div>`;
  }).join('');
}

function renderGallery(products) {
  const container = document.getElementById('dynamic-gallery');
  if (!container) return;

  // Layout pattern: tall, normal, wide, normal, sq, normal...
  const sizeMap = ['tall', '', 'wide', '', 'sq', '', 'tall', '', '', 'wide', '', ''];

  container.innerHTML = products.map((p, i) => {
    const img = (p.images && p.images.length > 0) ? Format.image(p.images[0]) : null;
    const sizeClass = sizeMap[i % sizeMap.length] || '';
    const placeholder = !img ? 'brand-placeholder-gradient' : '';

    return `
      <div class="gallery-item ${sizeClass} ${placeholder}"
           onclick="openGalleryModal(this)"
           data-product-name="${p.name}"
           data-product-desc="${p.description || ''}"
           data-product-category="${p.category || 'ARCHIVE'}">
        ${img
          ? `<img src="${img}" alt="${p.name}" loading="lazy">`
          : `<div class="placeholder-icon">HUVVSM</div>`
        }
        <div class="gallery-hover">
          <span class="label">${(p.category || 'ARCHIVE').toUpperCase()}</span>
          <span class="g-title">${p.name.toUpperCase()}</span>
        </div>
      </div>`;
  }).join('');
}

function renderEmptyState() {
  const s = document.getElementById('dynamic-stories');
  if (s) s.innerHTML = `
    <div class="container" style="text-align:center;padding:100px 0">
      <div class="label" style="opacity:0.4;margin-bottom:16px">NO_SIGNAL_FOUND</div>
      <h2 class="heading-2" style="margin-bottom:16px">IDENTITY_DATABASE_OFFLINE</h2>
      <p class="body-sm" style="color:var(--text-muted)">Upload products via the Admin Command Center to populate this editorial archive.</p>
    </div>`;
}

/* ── SCROLL ANIMATIONS ── */
function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Manifesto & quotes
  document.querySelectorAll('[data-gsap="reveal-text"]:not(.gsap-init)').forEach(el => {
    el.classList.add('gsap-init');
    gsap.fromTo(el,
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 1.6, ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
      }
    );
  });

  // Fade-up generics
  document.querySelectorAll('[data-gsap="fade-up"]:not(.gsap-init)').forEach(el => {
    el.classList.add('gsap-init');
    gsap.fromTo(el,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      }
    );
  });

  // Story parallax on images
  document.querySelectorAll('.story-img:not(.gsap-init)').forEach(img => {
    img.classList.add('gsap-init');
    gsap.to(img, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: img.closest('.story-image-wrap'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });

  // Story content slide-in
  document.querySelectorAll('.story-content:not(.gsap-init)').forEach(content => {
    content.classList.add('gsap-init');
    const fromLeft = content.parentElement.classList.contains('alternate-1');
    gsap.fromTo(Array.from(content.children),
      { opacity: 0, x: fromLeft ? 50 : -50 },
      { opacity: 1, x: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: content, start: 'top 80%' }
      }
    );
  });

  // Stats count-up
  document.querySelectorAll('.stat-item:not(.gsap-init)').forEach((item, i) => {
    item.classList.add('gsap-init');
    gsap.fromTo(item,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, delay: i * 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.stats-band', start: 'top 85%' }
      }
    );
  });

  // Gallery stagger
  const newGalleryItems = document.querySelectorAll('.gallery-item:not(.gsap-init)');
  if (newGalleryItems.length > 0) {
    newGalleryItems.forEach(i => i.classList.add('gsap-init'));
    gsap.fromTo(newGalleryItems,
      { opacity: 0, y: 36, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.06, ease: 'power3.out',
        scrollTrigger: { trigger: '.masonry-gallery', start: 'top 88%' }
      }
    );
  }

  // Collection hero
  const ch = document.querySelector('.collection-hero:not(.gsap-init)');
  if (ch) {
    ch.classList.add('gsap-init');
    gsap.fromTo(ch,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 1.4, ease: 'power4.out',
        scrollTrigger: { trigger: ch, start: 'top 80%' }
      }
    );
  }

  // Final CTA
  const fCta = document.querySelector('.final-cta-inner:not(.gsap-init)');
  if (fCta) {
    fCta.classList.add('gsap-init');
    gsap.fromTo(Array.from(fCta.children),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power3.out',
        scrollTrigger: { trigger: fCta, start: 'top 85%' }
      }
    );
  }
}

/* ── GALLERY MODAL ── */
function openGalleryModal(item) {
  const modal    = document.getElementById('galleryModal');
  const modalImg = document.getElementById('modalImage');

  if (!modal) return;

  const src      = item.querySelector('img')?.src || '';
  const name     = item.dataset.productName || '';
  const desc     = item.dataset.productDesc  || 'Analysis shows consistent identity parameters for this specimen.';
  const category = item.dataset.productCategory || 'ARCHIVE';

  if (src) { modalImg.src = src; modalImg.style.display = 'block'; }
  else { modalImg.style.display = 'none'; }

  document.getElementById('modalLabel').textContent = `${category.toUpperCase()}_UNIT`;
  document.getElementById('modalTitle').textContent = name.toUpperCase();
  document.getElementById('modalDesc').textContent  = desc;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  gsap.fromTo('.gallery-modal',
    { scale: 0.92, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.55, ease: 'power4.out' }
  );
  gsap.fromTo('.modal-info > *',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, delay: 0.2, ease: 'power3.out' }
  );
}

function closeGalleryModal() {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  gsap.to('.gallery-modal', {
    scale: 0.92, opacity: 0, duration: 0.35, ease: 'power4.in',
    onComplete: () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeGalleryModal();
});

// Close on backdrop click
document.getElementById('galleryModal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeGalleryModal();
});

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initLookbook, 100);
});