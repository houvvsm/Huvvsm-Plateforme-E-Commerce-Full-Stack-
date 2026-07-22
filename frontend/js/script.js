/* ============================================================ */
/* HUVVSM — PREMIUM MOTION & UI SYSTEM                          */
/* js/script.js                                                 */
/* ============================================================ */

let lenis;

function initMotionSystem() {
  // 1. Lenis Smooth Scroll (Optimized for ultra-smoothness & native touch response)
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
    });

    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
  }

  // 2. Custom Cursor & Glow (Ultra-Responsive)
  const cursor = document.querySelector('.custom-cursor');
  const cursorOuter = document.querySelector('.cursor-outer');
  const glow = document.getElementById('mouse-glow');

  if (cursor || glow) {
    // Duration 0 for instant response on the center dot
    const xCursor = cursor ? gsap.quickTo(cursor, "x", { duration: 0, ease: 'none' }) : null;
    const yCursor = cursor ? gsap.quickTo(cursor, "y", { duration: 0, ease: 'none' }) : null;

    // Slight duration for the outer ring to create a "trailing" luxury effect
    const xOuter = cursorOuter ? gsap.quickTo(cursorOuter, "x", { duration: 0.2, ease: 'power3.out' }) : null;
    const yOuter = cursorOuter ? gsap.quickTo(cursorOuter, "y", { duration: 0.2, ease: 'power3.out' }) : null;

    const xGlow = glow ? gsap.quickTo(glow, "x", { duration: 1, ease: 'power3.out' }) : null;
    const yGlow = glow ? gsap.quickTo(glow, "y", { duration: 1, ease: 'power3.out' }) : null;

    window.addEventListener('mousemove', e => {
      const { clientX: x, clientY: y } = e;

      if (xCursor) { xCursor(x); yCursor(y); }
      if (xOuter) { xOuter(x); yOuter(y); }
      if (xGlow) { xGlow(x); yGlow(y); }

      if (glow && (glow.style.opacity === '0' || !glow.style.opacity)) {
        gsap.to(glow, { opacity: 1, duration: 1 });
      }

      window.dispatchEvent(new CustomEvent('huvvsm:mousemove', { detail: { x, y } }));
    });

    document.querySelectorAll('a, button, [data-magnetic], .featured-card, .specimen-card, .thumb-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor?.classList.add('active');
        cursorOuter?.classList.add('active');
      });
      el.addEventListener('mouseleave', () => {
        cursor?.classList.remove('active');
        cursorOuter?.classList.remove('active');
      });
    });
  }

  // 3. Magnetic Elements
  initMagnetic();

  // 4. Reveal Animations
  initReveal();

  // 5. Navbar Behavior
  initNavbarBehavior();

  // 6. Tilt Effect
  initTilt();

  // 7. Counters
  initCounters();
}

function initMagnetic() {
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.4;
      const y = (e.clientY - r.top - r.height / 2) * 0.4;
      gsap.to(el, { x, y, duration: 0.6, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)' });
    });
  });
}

function initReveal() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const delay = el.dataset.revealDelay || 0;
    gsap.to(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      y: 0,
      opacity: 1,
      duration: 1.2,
      delay: delay * 0.15,
      ease: 'power4.out'
    });
  });
}

function initNavbarBehavior() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  // 1. Scrolled class toggle (Performance optimized via ScrollTrigger)
  ScrollTrigger.create({
    start: '120 top',
    onEnter: () => nav.classList.add('scrolled'),
    onLeaveBack: () => nav.classList.remove('scrolled'),
  });

  // 2. Hide/Show on scroll (Performance optimized via direction-aware ScrollTrigger)
  let isHidden = false;
  ScrollTrigger.create({
    onUpdate: (self) => {
      if (self.direction === 1 && !isHidden && self.scroll() > 600) {
        isHidden = true;
        gsap.to(nav, { y: '-200%', duration: 0.8, ease: 'power4.inOut' });
      } else if (self.direction === -1 && isHidden) {
        isHidden = false;
        gsap.to(nav, { y: '0%', duration: 0.8, ease: 'power4.out' });
      }
    }
  });

  // Mobile Menu Logic (Centralized & Global)
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.querySelector('.mobile-nav-close');

  console.log('[DEBUG] Mobile Elements:', { mobileBtn, drawer, closeBtn });

  if (mobileBtn && drawer) {
    mobileBtn.onclick = () => {
      console.log('[DEBUG] Opening Drawer');
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
  }

  if (closeBtn && drawer) {
    closeBtn.onclick = () => {
      console.log('[DEBUG] Closing Drawer');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    };
  }

  // Close on link click
  drawer?.querySelectorAll('a').forEach(link => {
    link.onclick = () => {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    };
  });
}

function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, {
        rotateY: x * 15,
        rotateX: -y * 15,
        scale: 1.02,
        duration: 0.6,
        ease: 'power3.out',
        transformPerspective: 1000
      });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out'
      });
    });
  });
}

function initCounters() {
  if (typeof ScrollTrigger === 'undefined') return;
  document.querySelectorAll('[data-counter]').forEach(el => {
    const val = parseFloat(el.innerText.replace(/,/g, ''));
    if (isNaN(val)) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => {
        gsap.from(el, {
          innerText: 0,
          duration: 2.5,
          snap: { innerText: 1 },
          ease: 'power3.out',
          onUpdate: () => {
            if (Number.isInteger(val)) {
              el.innerText = Math.floor(el.innerText).toLocaleString();
            } else {
              el.innerText = parseFloat(el.innerText).toFixed(1);
            }
          }
        });
      }
    });
  });
}

function initGlobalLoader() {
  const loader = document.getElementById('global-loader');
  const bar = loader?.querySelector('.loader-bar');
  if (!loader) return;

  const tl = gsap.timeline({
    onComplete: () => {
      loader.classList.add('hidden');
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }
  });

  tl.to(bar, {
    width: '100%',
    duration: 1.5,
    ease: 'power2.inOut'
  })
    .add(() => {
      if (typeof window.HUVVSM_ENTRANCE === 'function') {
        window.HUVVSM_ENTRANCE();
      }
    }, '+=0.1')
    .to(loader, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut'
    });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  initGlobalLoader();
  initMotionSystem();

  window.addEventListener('resize', () => {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});
