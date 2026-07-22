/* ============================================================ */
/* HUVVSM — GLOBAL UTILITIES                                    */
/* js/globals.js                                                */
/* ============================================================ */

/* ============================================================ */
/* API LAYER — Ready to connect to backend                      */
/* ============================================================ */

const API = {
  BASE: 'http://localhost:5000/api/v1',        // ← swap for your backend URL

  // Safe JSON extraction — throws a clear error if the response is not JSON
  async _json(res) {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(
        `Server returned an unexpected response (HTTP ${res.status} ${res.statusText}). ` +
        `Expected JSON but received ${ct || 'unknown content type'}. ` +
        `Check that the backend is running on port 5000.`
      );
    }
    return res.json();
  },

  async get(endpoint) {
    try {
      const res = await fetch(`${this.BASE}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw await this._json(res);
      return await this._json(res);
    } catch(err) {
      console.error('[API GET]', endpoint, err.message);
      throw err;
    }
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${this.BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw await this._json(res);
      return await this._json(res);
    } catch(err) {
      console.error('[API POST]', endpoint, err.message);
      throw err;
    }
  },

  async patch(endpoint, data) {
    try {
      const res = await fetch(`${this.BASE}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw await this._json(res);
      return await this._json(res);
    } catch(err) {
      console.error('[API PATCH]', endpoint, err.message);
      throw err;
    }
  },

  async delete(endpoint) {
    try {
      const res = await fetch(`${this.BASE}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw await this._json(res);
      return await this._json(res);
    } catch(err) {
      console.error('[API DELETE]', endpoint, err.message);
      throw err;
    }
  }
};

/* ============================================================ */
/* AUTH LAYER                                                   */
/* ============================================================ */

const Auth = {
  getToken:   ()         => localStorage.getItem('huvvsm_token'),
  setToken:   (token)    => localStorage.setItem('huvvsm_token', token),
  removeToken: ()        => localStorage.removeItem('huvvsm_token'),
  getUser:    ()         => JSON.parse(localStorage.getItem('huvvsm_user') || 'null'),
  setUser:    (user)     => localStorage.setItem('huvvsm_user', JSON.stringify(user)),
  isLoggedIn: ()         => !!localStorage.getItem('huvvsm_token'),

  async login(email, password) {
    const data = await API.post('/auth/login', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    await this.syncLocalData();
    return data;
  },

  async register(payload) {
    const data = await API.post('/auth/register', payload);
    this.setToken(data.token);
    this.setUser(data.user);
    await this.syncLocalData();
    return data;
  },

  async syncLocalData() {
    // 1. Sync Cart
    const localCart = Cart.get();
    if (localCart.length > 0) {
      for (const item of localCart) {
        try {
          await API.post('/cart', { 
            productId: item.id, 
            quantity: item.quantity, 
            size: item.size 
          });
        } catch (err) {
          console.error('Failed to sync cart item', item.name, err);
        }
      }
      Cart.clear(); // Clear local storage after sync
    }

    // 2. Sync Wishlist
    const localWishlist = Wishlist.get();
    if (localWishlist.length > 0) {
      for (const productId of localWishlist) {
        try {
          await API.post(`/wishlist/${productId}`);
        } catch (err) {
          console.error('Failed to sync wishlist item', productId, err);
        }
      }
      localStorage.removeItem(Wishlist._key); // Clear local wishlist
    }
    
    // Final UI Update
    Cart._update();
    Wishlist._updateButtons();
  },

  logout() {
    this.removeToken();
    localStorage.removeItem('huvvsm_user');
    window.location.href = 'auth.html';
  }
};

/* ============================================================ */
/* CART STATE                                                   */
/* ============================================================ */

const Cart = {
  _key: 'huvvsm_cart',

  get() {
    return JSON.parse(localStorage.getItem(this._key) || '[]');
  },

  save(items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this._update();
  },

  add(product) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id && i.size === product.size);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      items.push({ ...product, quantity: product.quantity || 1 });
    }
    this.save(items);
    if (typeof Toast !== 'undefined') Toast.success(`${product.name} added to cart`);
  },

  remove(id, size) {
    const items = this.get().filter(i => !(i.id === id && i.size === size));
    this.save(items);
  },

  updateQty(id, size, qty) {
    const items = this.get();
    const item = items.find(i => i.id === id && i.size === size);
    if (item) { item.quantity = qty; }
    if (qty <= 0) return this.remove(id, size);
    this.save(items);
  },

  clear() {
    localStorage.removeItem(this._key);
    this._update();
  },

  async count() {
    if (Auth.isLoggedIn()) {
      try {
        const res = await API.get('/cart');
        return res.data.reduce((acc, i) => acc + i.quantity, 0);
      } catch (e) {
        return this.get().reduce((acc, i) => acc + i.quantity, 0);
      }
    }
    return this.get().reduce((acc, i) => acc + i.quantity, 0);
  },

  total() {
    return this.get().reduce((acc, i) => acc + (i.price * i.quantity), 0);
  },

  async _update() {
    const count = await this.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'grid' : 'none';
    });
  }
};

/* ============================================================ */
/* WISHLIST STATE                                               */
/* ============================================================ */

const Wishlist = {
  _key: 'huvvsm_wishlist',

  get()          { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
  has(id)        { return this.get().includes(id); },
  toggle(id, name) {
    const list = this.get();
    const idx = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
      if (typeof Toast !== 'undefined') Toast.info(`Removed from wishlist`);
    } else {
      list.push(id);
      if (typeof Toast !== 'undefined') Toast.success(`${name || 'Item'} added to wishlist`);
    }
    localStorage.setItem(this._key, JSON.stringify(list));
    this._updateButtons();
  },
  _updateButtons() {
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      const id = btn.dataset.productId;
      btn.classList.toggle('active', this.has(id));
    });
  }
};

/* ============================================================ */
/* FORMATTING UTILITIES                                         */
/* ============================================================ */

const Format = {
  date(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  },
  price(amount) {
    return Number(amount).toLocaleString('fr-MA') + ' DH';
  },
  image(path) {
    if (!path || path === 'undefined' || path === 'null' || path === '') {
      return 'https://via.placeholder.com/150/05060a/00e5ff?text=SIGNAL_LOST';
    }
    if (path.startsWith('http')) return path;
    
    const serverBase = API.BASE.replace('/api/v1', '');
    let cleanPath = path;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
    
    // If it doesn't already have 'uploads' in it, prepend it
    if (!cleanPath.includes('uploads/')) {
      return `${serverBase}/uploads/${cleanPath}`;
    }
    return `${serverBase}/${cleanPath}`;
  }
};

/* ============================================================ */
/* TOAST SYSTEM                                                 */
/* ============================================================ */

const Toast = {
  container: null,

  init() {
    if (document.querySelector('.toast-container')) {
      this.container = document.querySelector('.toast-container');
      return;
    }
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'info') {
    if (!this.container) this.init();
    const icons = { success: '✓', error: '✕', info: '◈' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="color:var(--accent);font-family:var(--font-mono)">${icons[type]}</span> ${message}`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn .4s var(--ease) reverse';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  },

  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error'),
  info:    (msg) => Toast.show(msg, 'info')
};

/* ============================================================ */
/* THEME MANAGEMENT SYSTEM                                      */
/* ============================================================ */

const Theme = {
  _key: 'huvvsm_theme',

  init() {
    const saved = localStorage.getItem(this._key) || 'dark';
    this.set(saved);
    
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('click', () => this.toggle());
      }
    });
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this._key, theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    this.set(target);
    
    // Add a quick feedback animation
    const btn = document.getElementById('themeToggle');
    if (btn && typeof gsap !== 'undefined') {
      gsap.fromTo(btn, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
    }
  }
};

Theme.init();

/* ============================================================ */
/* MODAL UTILITY                                                */
/* ============================================================ */
const Modal = {
  open(id) { const el=document.getElementById(id); if(el){el.classList.add('open');document.body.style.overflow='hidden';} },
  close(id) { const el=document.getElementById(id); if(el){el.classList.remove('open');document.body.style.overflow='';} }
};

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) { e.target.classList.remove('open'); document.body.style.overflow=''; }
});

/* ============================================================ */
/* INIT STATE ON DOM READY                                      */
/* ============================================================ */

async function updateNavbarAuth() {
  const accountBtn = document.querySelector('button[onclick*="auth.html"]');
  if (accountBtn && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    accountBtn.title = `Logged in as ${user.name}`;
    
    let hasUnread = false;
    try {
      const res = await fetch(`${API.BASE}/support/tickets`, {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      if (res.ok) {
        const json = await res.json();
        const tickets = json.data || [];
        hasUnread = tickets.some(t => t.status === 'WAITING_CUSTOMER');
      }
    } catch (e) {
      console.warn('[NAVBAR UNREAD CHECK FAILED]', e);
    }
    
    accountBtn.innerHTML = `👤<span class="navbar-dot" style="display: ${hasUnread ? 'block' : 'none'}; background: #ff4d6d;"></span>`;
    accountBtn.classList.add('logged-in');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Cart._update();
  Wishlist._updateButtons();
  updateNavbarAuth();
});

/* ============================================================ */
/* CHAT MESSAGE FORMATTING UTILITY                              */
/* ============================================================ */
function formatMessage(text) {
  if (!text) return '';
  
  // 1. Sanitize HTML tags to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // 2. Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 3. Lists: handle lines starting with • or -
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc;">');
        inList = true;
      }
      const itemContent = trimmed.substring(1).trim();
      processedLines.push(`<li style="margin-bottom: 4px;">${itemContent}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  // Join lines back
  html = processedLines.join('\n');
  
  // 4. Line breaks: \n\n -> paragraph margin, \n -> <br>
  html = html
    .replace(/\n\n/g, '<div style="margin-bottom: 12px;"></div>')
    .replace(/\n/g, '<br>');
    
  return html;
}
