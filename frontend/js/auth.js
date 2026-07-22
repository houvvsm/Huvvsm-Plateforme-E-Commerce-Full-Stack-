/* ============================================================ */
/* HUVVSM — AUTHENTICATION PAGE LOGIC                           */
/* js/auth.js                                                  */
/* ============================================================ */

/* ── TAB SWITCHER (login / register) ── */
function initAuthTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      forms.forEach(f => {
        f.classList.remove('active');
        if (f.id === target + 'Form') {
          f.classList.add('active');
          if (typeof gsap !== 'undefined') {
            gsap.from(f, { opacity: 0, y: 10, duration: 0.5, ease: 'power2.out' });
          }
        }
      });
    });
  });
}

/* ── LOGIN / REGISTER FORMS ── */
function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('input[type="email"]').value;
      const password = loginForm.querySelector('input[type="password"]').value;
      try {
        const data = await Auth.login(email, password);
        Toast.success('SESSION_INITIALIZED');
        setTimeout(() => {
          if (data.user.role === 'ADMIN' || data.user.role === 'OWNER') {
            window.location.href = 'admin.html';
          } else {
            window.location.reload();
          }
        }, 1000);
      } catch (err) {
        Toast.error(err.message || 'AUTHENTICATION_FAILED');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = registerForm.querySelector('input[placeholder="NEO_ENTITY"]').value;
      const email = registerForm.querySelector('input[type="email"]').value;
      const password = registerForm.querySelector('input[type="password"]').value;
      try {
        await Auth.register({ name, email, password });
        Toast.success('IDENTITY_ESTABLISHED');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        Toast.error(err.message || 'REGISTRATION_FAILED');
      }
    });
  }
}

/* ── PROFILE PANEL TABS (wishlist / orders) ── */
function initProfileTabs() {
  const tabs = document.querySelectorAll('.profile-tab');
  const panels = document.querySelectorAll('.profile-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.ptab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach(p => {
        p.classList.remove('active');
        if (p.id === 'panel-' + target) p.classList.add('active');
      });
      if (target === 'rewards') loadRewards();
      else if (target === 'wishlist') loadWishlist();
      else if (target === 'orders') loadOrders();
      else if (target === 'support') loadSupportTickets();
    });
  });
}

/* ── RENDER WISHLIST ── */
async function loadWishlist() {
  const container = document.getElementById('wishlistContent');
  if (!container) return;

  try {
    const res = await API.get('/wishlist');
    const items = res.data || [];

    if (items.length === 0) {
      container.innerHTML = `
        <div class="panel-empty">
          <div class="panel-empty-icon">♡</div>
          <p>WISHLIST_EMPTY: NO SAVED SIGNALS</p>
          <a href="shop.html" class="btn btn-primary">BROWSE_CATALOGUE</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="wishlist-grid">
        ${items.map(item => {
          const p = item.product;
          const img = Format.image(
            (p.images && p.images.length > 0) ? p.images[0] : ''
          );
          return `
            <div class="wishlist-card" onclick="window.location='product.html?id=${p.id}'">
              <button class="wishlist-card-remove" title="Remove" onclick="event.stopPropagation(); removeWishlistItem('${p.id}')">×</button>
              <img src="${img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200/05060a/00e5ff?text=NFD'">
              <div class="wishlist-card-info">
                <div class="wishlist-card-name">${p.name}</div>
                <div class="wishlist-card-price">${Format.price(p.price)}</div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<p class="panel-empty"><span class="panel-empty-icon">⚠</span><br>FETCH_FAILED: ${err.message}</p>`;
  }
}

async function removeWishlistItem(productId) {
  try {
    await API.post(`/wishlist/${productId}`); // toggle = remove if exists
    Toast.success('SIGNAL_REMOVED');
    loadWishlist();
  } catch (err) {
    Toast.error('REMOVE_FAILED');
  }
}

/* ── RENDER ORDER HISTORY ── */
async function loadOrders() {
  const container = document.getElementById('ordersContent');
  if (!container) return;

  try {
    const res = await API.get('/orders');
    const orders = res.data || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="panel-empty">
          <div class="panel-empty-icon">⊞</div>
          <p>ORDER_HISTORY_EMPTY: NO TRANSACTIONS FOUND</p>
          <a href="shop.html" class="btn btn-primary">START_SHOPPING</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="order-list">
        ${orders.map(order => {
          const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
          });
          const shortId = order.id.slice(0, 8).toUpperCase();

          const itemsHtml = order.items.map(oi => {
            const p = oi.product;
            const img = Format.image(
              (p.images && p.images.length > 0) ? p.images[0] : ''
            );
            return `
              <div class="order-item-row">
                <img class="order-item-img" src="${img}" alt="${p.name}"
                  onerror="this.src='https://via.placeholder.com/48/05060a/00e5ff?text=NFD'">
                <div class="order-item-info">
                  <div class="order-item-name">${p.name}</div>
                  <div class="order-item-meta">SIZE: ${oi.size} &nbsp;·&nbsp; QTY: ${oi.quantity}</div>
                </div>
                <div class="order-item-price">${Format.price(oi.price * oi.quantity)}</div>
                <button class="btn btn-ghost btn-sm rate-btn" onclick="event.stopPropagation(); openReviewModal('${p.id}', '${escapeAttr(p.name)}')">
                  ★ RATE
                </button>
              </div>`;
          }).join('');

          return `
            <div class="order-card" id="order-${order.id}">
              <div class="order-card-header" onclick="toggleOrder('${order.id}')">
                <div class="order-card-meta">
                  <span class="order-id">#${shortId}</span>
                  <span class="order-date">${date}</span>
                </div>
                <div class="order-card-right">
                  <span class="order-total">${Format.price(order.total)}</span>
                  <span class="order-status status-${order.status}">${order.status}</span>
                  <span class="order-toggle-icon">▼</span>
                </div>
              </div>
              <div class="order-card-items">
                ${itemsHtml}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<p class="panel-empty"><span class="panel-empty-icon">⚠</span><br>FETCH_FAILED: ${err.message}</p>`;
  }
}

function toggleOrder(orderId) {
  const card = document.getElementById('order-' + orderId);
  if (card) card.classList.toggle('expanded');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ── REVIEW MODAL ── */
let _reviewSelectedRating = 0;
let _reviewProductId = null;

function openReviewModal(productId, productName) {
  _reviewProductId = productId;
  _reviewSelectedRating = 0;

  const modal = document.getElementById('reviewModal');
  const titleEl = document.getElementById('reviewProductName');
  const commentEl = document.getElementById('reviewComment');
  const errEl = document.getElementById('reviewError');

  if (titleEl) titleEl.textContent = productName;
  if (commentEl) commentEl.value = '';
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  renderStarPicker();

  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function renderStarPicker() {
  const picker = document.getElementById('starPicker');
  if (!picker) return;

  picker.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star-pick';
    star.textContent = i <= _reviewSelectedRating ? '★' : '☆';
    star.dataset.value = i;
    star.onclick = () => {
      _reviewSelectedRating = i;
      renderStarPicker();
    };
    picker.appendChild(star);
  }
}

async function submitReview() {
  const commentEl = document.getElementById('reviewComment');
  const errEl = document.getElementById('reviewError');
  const btn = document.getElementById('submitReviewBtn');

  if (_reviewSelectedRating < 1) {
    if (errEl) { errEl.textContent = 'SELECT_A_RATING_BEFORE_TRANSMITTING'; errEl.style.display = 'block'; }
    return;
  }

  btn.disabled = true;
  btn.textContent = 'TRANSMITTING...';

  try {
    await API.post(`/products/${_reviewProductId}/reviews`, {
      rating: _reviewSelectedRating,
      comment: commentEl ? commentEl.value.trim() : ''
    });
    Toast.success('SIGNAL_FEEDBACK_RECEIVED');
    closeReviewModal();
  } catch (err) {
    if (errEl) {
      errEl.textContent = (err.error || err.message || 'TRANSMISSION_FAILED').toUpperCase();
      errEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'TRANSMIT_FEEDBACK';
  }
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  const modal = document.getElementById('reviewModal');
  if (modal && e.target === modal) closeReviewModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeReviewModal();
});

/* ── AUTH STATE CHECK ── */
function checkAuthState() {
  const authCard = document.getElementById('authCard');
  const profileCard = document.getElementById('profileCard');

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (authCard) authCard.style.display = 'none';
    if (profileCard) {
      profileCard.style.display = 'block';
      document.getElementById('profileName').textContent = user.name;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileRole').textContent = user.role;

      const adminPanelBtn = document.getElementById('adminPanelBtn');
      if (adminPanelBtn) {
        if (user.role === 'ADMIN' || user.role === 'OWNER') {
          adminPanelBtn.style.display = 'block';
        } else {
          adminPanelBtn.style.display = 'none';
        }
      }

      if (typeof gsap !== 'undefined') {
        gsap.from(profileCard, { opacity: 0, scale: 0.95, duration: 0.8, ease: 'power4.out' });
      }

      // Load panels
      loadWishlist();
      loadOrders();
      loadRewards();
      checkUnreadSupportReplies();

      // Check URL parameters for tab navigation
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'support') {
        const supportTab = document.querySelector('[data-ptab="support"]');
        if (supportTab) {
          setTimeout(() => supportTab.click(), 300);
        }
      }
    }
  } else {
    if (authCard) authCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
  }
}

/* ── RENDER REWARDS ECOSYSTEM ── */
async function loadRewards() {
  const container = document.getElementById('rewardsContent');
  if (!container) return;

  try {
    const res = await API.get('/rewards/my');
    const d = res.data;

    let nextRewardHtml = '';
    if (d.nextThreshold) {
      nextRewardHtml = `
        <div style="margin-top:20px; background:rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-family:var(--font-mono); font-size:10px; color:#888; letter-spacing:0.1em;">NEXT_REWARD_THRESHOLD</span>
            <span style="font-family:var(--font-mono); font-size:11px; color:#8b5cff; font-weight:700;">${d.points} / ${d.nextThreshold.pointsNeeded} PTS</span>
          </div>
          
          <!-- Futuristic Progress Bar -->
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; position:relative; border: 1px solid rgba(255,255,255,0.05);">
            <div style="width:${d.progressPercent}%; height:100%; background:linear-gradient(90deg, #00E5FF, #8b5cff); border-radius:4px; transition: width 0.8s ease;"></div>
          </div>
          
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:8px; color:var(--text-muted);">
            <span>${d.progressPercent}% PROGRESS</span>
            <span style="color:#00E5FF; font-weight:600;">UNLOCK ${d.nextThreshold.discountPercent}% OFF COUPON</span>
          </div>
        </div>
      `;
    }

    let couponsHtml = '';
    if (d.coupons.length === 0) {
      couponsHtml = `
        <div class="panel-empty" style="padding:20px 0;">
          <p style="font-family:var(--font-mono); font-size:10px; letter-spacing:0.08em; color:#555;">NO_COUPONS_GENERATED_YET</p>
        </div>`;
    } else {
      couponsHtml = `
        <div style="display:grid; grid-template-columns: 1fr; gap:12px; margin-top:10px;">
          ${d.coupons.map(c => `
            <div style="background:linear-gradient(135deg, rgba(0,229,255,0.05), rgba(139,92,255,0.02)); border: 1px dashed rgba(0,229,255,0.25); border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden;">
              <!-- Left aesthetic dot -->
              <span style="position:absolute; left:-6px; top:50%; transform:translateY(-50%); width:12px; height:12px; border-radius:50%; background:var(--bg); border-right:1px dashed rgba(0,229,255,0.25);"></span>
              <!-- Right aesthetic dot -->
              <span style="position:absolute; right:-6px; top:50%; transform:translateY(-50%); width:12px; height:12px; border-radius:50%; background:var(--bg); border-left:1px dashed rgba(0,229,255,0.25);"></span>
              
              <div>
                <div style="font-family:var(--font-mono); font-weight:700; color:#00E5FF; font-size:14px; letter-spacing:0.05em; display:flex; align-items:center; gap:8px;">
                  ${c.code}
                  <span onclick="navigator.clipboard.writeText('${c.code}'); Toast.success('COPIED_TO_CLIPBOARD');" style="cursor:pointer; font-size:11px; opacity:0.6; hover:opacity:1;" title="Copy Code">📋</span>
                </div>
                <div style="font-family:var(--font-mono); font-size:9px; color:#777; margin-top:4px; letter-spacing:0.05em;">EXP: ${new Date(c.expiresAt).toLocaleDateString()}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:'Bebas Neue', sans-serif; font-size:1.8rem; color:#8b5cff; line-height:1;">${c.discountPercent}% OFF</div>
                <div style="font-family:var(--font-mono); font-size:8px; color:rgba(139,92,255,0.6); letter-spacing:0.1em; margin-top:2px;">REDEEM_AT_CHECKOUT</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    let historyHtml = '';
    if (d.history.length === 0) {
      historyHtml = `<p style="font-family:var(--font-mono); font-size:10px; color:#555; text-align:center; padding:20px 0;">NO_TRANSACTION_TRANSMISSIONS</p>`;
    } else {
      historyHtml = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; max-height: 250px; overflow-y: auto; padding-right:4px;">
          ${d.history.map(h => {
            const isGain = h.points > 0;
            const ptsText = isGain ? `+${h.points}` : `${h.points}`;
            const color = isGain ? '#00ff7f' : '#ff4d6d';
            const signBg = isGain ? 'rgba(0,255,127,0.06)' : 'rgba(255,77,109,0.06)';
            const border = isGain ? 'rgba(0,255,127,0.15)' : 'rgba(255,77,109,0.15)';
            return `
              <div style="background:rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
                <div style="min-width:0; flex:1;">
                  <div style="font-size:11.5px; line-height:1.4; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${h.description}</div>
                  <div style="font-family:var(--font-mono); font-size:9px; color:#555; margin-top:2px;">${new Date(h.createdAt).toLocaleDateString()}</div>
                </div>
                <div style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:${color}; background:${signBg}; border:1px solid ${border}; padding:3px 8px; border-radius:6px; flex-shrink:0;">
                  ${ptsText} PTS
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    container.innerHTML = `
      <!-- Points Balance HUD -->
      <div style="display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px; margin-bottom:20px;">
        <div>
          <div style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted); letter-spacing:0.12em;">TOTAL_LOYALTY_RESERVE</div>
          <div style="font-family:'Bebas Neue', sans-serif; font-size:2.8rem; color:#00E5FF; line-height:1; margin-top:6px;">${d.points} <span style="font-size:1rem; font-family:'Space Mono'; vertical-align:middle; color:#00E5FF;">PTS</span></div>
        </div>
        <div style="width:48px; height:48px; border-radius:12px; background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.2); display:flex; align-items:center; justify-content:center; font-size:20px; color:#00E5FF;">✦</div>
      </div>

      <!-- Next Reward Progress -->
      ${nextRewardHtml}

      <!-- Coupons Section -->
      <div style="margin-top:28px;">
        <h4 style="font-family:var(--font-mono); font-size:10px; letter-spacing:0.12em; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px; margin-bottom:12px;">ACTIVE_COUPON_CREDENTIALS</h4>
        ${couponsHtml}
      </div>

      <!-- History Section -->
      <div style="margin-top:28px;">
        <h4 style="font-family:var(--font-mono); font-size:10px; letter-spacing:0.12em; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px; margin-bottom:12px;">TRANSMISSION_HISTORY</h4>
        ${historyHtml}
      </div>
    `;

  } catch (err) {
    console.error('[LOAD REWARDS ERROR]', err);
    container.innerHTML = `<p class="panel-empty"><span class="panel-empty-icon">⚠</span><br>FETCH_FAILED: ${err.message || 'SYSTEM_OFFLINE'}</p>`;
  }
}


/* ============================================================ */
/* HUVVSM V2 — CUSTOMER SUPPORT INBOX SYSTEM                    */
/* ============================================================ */

let activeTicketId = null;

// Check if any tickets are waiting customer response to show unread dot
async function checkUnreadSupportReplies() {
  try {
    const res = await API.get('/support/tickets');
    const tickets = res.data || [];
    const hasUnread = tickets.some(t => t.status === 'WAITING_CUSTOMER');
    const dot = document.getElementById('supportUnreadDot');
    if (dot) {
      dot.style.display = hasUnread ? 'block' : 'none';
    }
    const navAuthBtn = document.querySelector('button[onclick*="auth.html"]');
    if (navAuthBtn && hasUnread) {
      navAuthBtn.innerHTML = '👤<span class="navbar-dot" style="background:#ff4d6d"></span>';
    }
  } catch (err) {
    console.warn('[CHECK UNREAD ERROR]', err);
  }
}

// Load tickets list or specific ticket view
async function loadSupportTickets(ticketIdToOpen = null) {
  const container = document.getElementById('supportInboxContent');
  if (!container) return;

  try {
    // If ticketId is passed via URL search parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paramTicketId = ticketIdToOpen || urlParams.get('ticketId') || activeTicketId;
    const isNewAction = urlParams.get('action') === 'new-ticket';

    if (isNewAction) {
      const cat = urlParams.get('category') || localStorage.getItem('pending_ticket_category') || 'ORDER_PROBLEM';
      showNewTicketForm(cat);
      return;
    }

    if (paramTicketId) {
      await loadSingleTicketView(paramTicketId);
      return;
    }

    const res = await API.get('/support/tickets');
    const tickets = res.data || [];

    if (tickets.length === 0) {
      container.innerHTML = `
        <div class="panel-empty" style="padding: 40px 20px;">
          <div class="panel-empty-icon">🎧</div>
          <p>SUPPORT_CHANNEL_SECURE: NO ACTIVE TICKETS</p>
          <p style="font-size:12px;color:var(--text-muted);margin:10px 0 20px;">Submit a signal to our human operators if you need assistance.</p>
          <button class="btn btn-primary" onclick="showNewTicketForm()">TRANSMIT_NEW_TICKET</button>
        </div>`;
      return;
    }

    // Render list of tickets
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
        <h4 style="font-family:var(--font-mono); font-size:11px; letter-spacing:0.12em; color:var(--text-muted); margin:0;">ACTIVE_SUPPORT_SIGNALS</h4>
        <button class="btn btn-primary btn-sm" onclick="showNewTicketForm()" style="font-family:var(--font-mono); font-size:9px;">+ NEW_SIGNAL</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${tickets.map(t => {
          const date = new Date(t.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
          const shortId = t.id.slice(0, 8).toUpperCase();
          const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].content : 'No messages';
          const truncatedMsg = lastMsg.length > 60 ? lastMsg.slice(0, 60) + '...' : lastMsg;
          
          let statusColor = '#00E5FF';
          if (t.status === 'WAITING_CUSTOMER') statusColor = '#ff4d6d';
          else if (t.status === 'WAITING_SUPPORT') statusColor = '#ffc107';
          else if (t.status === 'RESOLVED') statusColor = '#00ff7f';
          else if (t.status === 'CLOSED') statusColor = '#888';

          return `
            <div onclick="loadSupportTickets('${t.id}')" style="background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:18px 20px; cursor:pointer; transition:all 0.2s; display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.borderColor='rgba(0,229,255,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
              <div style="min-width:0; flex:1; padding-right:16px;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                  <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:#fff;">#${shortId}</span>
                  <span style="font-family:var(--font-mono); font-size:8px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; color:var(--text-muted);">${t.category}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${truncatedMsg}</div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                <span style="font-family:var(--font-mono); font-size:9px; font-weight:700; color:${statusColor}; border:1px solid ${statusColor}40; background:${statusColor}0a; padding:3px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">${t.status}</span>
                <div style="font-size:10px; color:#555; font-family:var(--font-mono);">${date}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
    `;

  } catch (err) {
    const errMsg = err?.error || err?.message || JSON.stringify(err) || 'BACKEND_OFFLINE';
    container.innerHTML = `<p class="panel-empty"><span class="panel-empty-icon">⚠</span><br>SIGNAL_LOST: ${errMsg}</p>`;
  }
}

// Show new ticket creation form
function showNewTicketForm(prefilledCat = null) {
  const container = document.getElementById('supportInboxContent');
  if (!container) return;

  const savedLog = localStorage.getItem('pending_ticket_log') || '';
  const initialMsg = savedLog ? `[AI Chat Log Context]\n${savedLog}\n\n[Explain details below...]\n` : '';

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
      <h4 style="font-family:var(--font-mono); font-size:11px; letter-spacing:0.12em; color:var(--text-muted); margin:0;">ESTABLISH_NEW_SUPPORT_SIGNAL</h4>
      <button class="btn btn-ghost btn-sm" onclick="cancelNewTicket()" style="font-family:var(--font-mono); font-size:9px;">← BACK</button>
    </div>
    
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div class="input-group">
        <label class="label" style="font-family:var(--font-mono); font-size:9px; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:6px;">PROBLEM_CATEGORY</label>
        <select id="newTicketCategory" class="input" style="background:#070810; border: 1px solid var(--line); border-radius:8px; color:#fff; padding:12px 16px; font-family:var(--font-body); font-size:13px; outline:none; width:100%; box-sizing:border-box;">
          <option value="ORDER_PROBLEM" ${prefilledCat === 'ORDER_PROBLEM' ? 'selected' : ''}>ORDER_PROBLEM</option>
          <option value="PAYMENT_PROBLEM" ${prefilledCat === 'PAYMENT_PROBLEM' ? 'selected' : ''}>PAYMENT_PROBLEM</option>
          <option value="PRODUCT_ISSUE" ${prefilledCat === 'PRODUCT_ISSUE' ? 'selected' : ''}>PRODUCT_ISSUE</option>
          <option value="RETURN_EXCHANGE" ${prefilledCat === 'RETURN_EXCHANGE' ? 'selected' : ''}>RETURN_EXCHANGE</option>
          <option value="ACCOUNT_ISSUE" ${prefilledCat === 'ACCOUNT_ISSUE' ? 'selected' : ''}>ACCOUNT_ISSUE</option>
          <option value="OTHER" ${prefilledCat === 'OTHER' ? 'selected' : ''}>OTHER</option>
        </select>
      </div>
      
      <div class="input-group">
        <label class="label" style="font-family:var(--font-mono); font-size:9px; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:6px;">EXPLAIN_PROBLEM_SIGNAL</label>
        <textarea id="newTicketMessage" class="input" placeholder="Type details here..." style="min-height:150px; resize:vertical; background:rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius:8px; color:#fff; padding:12px 16px; font-family:var(--font-body); font-size:13.5px; outline:none; width:100%; box-sizing:border-box;">${initialMsg}</textarea>
      </div>

      <button class="btn btn-primary btn-lg w-full" id="createNewTicketBtn" onclick="createNewTicket()">TRANSMIT_SIGNAL</button>
    </div>
  `;
}

function cancelNewTicket() {
  // Clear url parameters and reload tickets list
  const url = new URL(window.location);
  url.searchParams.delete('action');
  url.searchParams.delete('category');
  window.history.pushState({}, '', url);
  loadSupportTickets();
}

async function createNewTicket() {
  const category = document.getElementById('newTicketCategory').value;
  const message = document.getElementById('newTicketMessage').value.trim();
  const btn = document.getElementById('createNewTicketBtn');

  if (!message) {
    Toast.error('Please describe your problem before transmitting.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'TRANSMITTING...';

  try {
    const res = await API.post('/support/tickets', { category, message });
    if (res.success) {
      Toast.success('SIGNAL_SECURED_AND_TRANSMITTED');
      localStorage.removeItem('pending_ticket_category');
      localStorage.removeItem('pending_ticket_log');
      
      // Clean query params
      const url = new URL(window.location);
      url.searchParams.delete('action');
      url.searchParams.delete('category');
      window.history.pushState({}, '', url);

      activeTicketId = res.data.id;
      loadSupportTickets(res.data.id);
    }
  } catch (err) {
    Toast.error(err.error || 'Signal transmission failed');
    btn.disabled = false;
    btn.textContent = 'TRANSMIT_SIGNAL';
  }
}

// Load conversation view for single ticket
async function loadSingleTicketView(ticketId) {
  activeTicketId = ticketId;
  const container = document.getElementById('supportInboxContent');
  if (!container) return;

  try {
    const res = await API.get(`/support/tickets/${ticketId}`);
    const ticket = res.data;

    let statusColor = '#00E5FF';
    if (ticket.status === 'WAITING_CUSTOMER') statusColor = '#ff4d6d';
    else if (ticket.status === 'WAITING_SUPPORT') statusColor = '#ffc107';
    else if (ticket.status === 'RESOLVED') statusColor = '#00ff7f';
    else if (ticket.status === 'CLOSED') statusColor = '#888';

    const shortId = ticket.id.slice(0, 8).toUpperCase();

    // Render messages list
    const messagesHtml = ticket.messages.map(m => {
      const isMe = m.senderId === Auth.getUser().id;
      const roleText = isMe ? 'YOU' : 'HUVVSM SUPPORT';
      const bubbleClass = isMe ? 'user' : 'model';
      const bg = isMe ? 'linear-gradient(135deg, #8b5cff, #6d46cc)' : 'rgba(255,255,255,0.03)';
      const align = isMe ? 'flex-end' : 'flex-start';
      const borderRad = isMe ? 'border-bottom-right-radius: 2px;' : 'border-bottom-left-radius: 2px; border: 1px solid var(--glass-border);';

      return `
        <div style="align-self:${align}; max-width:80%; display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
          <div style="font-family:var(--font-mono); font-size:8px; color:var(--text-muted); text-align:${isMe ? 'right' : 'left'};">${roleText} · ${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          <div style="background:${bg}; color:#fff; padding:12px 16px; border-radius:12px; ${borderRad} font-size:12.5px; line-height:1.5; word-wrap:break-word;">
            ${m.content}
          </div>
        </div>`;
    }).join('');

    // Check if rating widget is needed (RESOLVED status and no rating submitted yet)
    let ratingWidgetHtml = '';
    if (ticket.status === 'RESOLVED' && !ticket.rating) {
      ratingWidgetHtml = `
        <div id="ratingWidget" style="background:rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.15); border-radius:16px; padding:24px; text-align:center; margin:16px 0; display:flex; flex-direction:column; gap:12px; align-items:center;">
          <div style="font-family:var(--font-mono); font-size:10px; color:#00E5FF; letter-spacing:0.12em;">// SERVICE_EVALUATION_REQUEST</div>
          <h5 style="margin:0; font-size:15px; font-weight:700; color:#fff;">How was your support experience?</h5>
          
          <div style="display:flex; gap:10px; font-size:2rem; cursor:pointer;" id="customerStarPicker">
            <span onclick="setTicketRating(1)" class="customer-star" data-val="1" style="color:var(--text-muted)">☆</span>
            <span onclick="setTicketRating(2)" class="customer-star" data-val="2" style="color:var(--text-muted)">☆</span>
            <span onclick="setTicketRating(3)" class="customer-star" data-val="3" style="color:var(--text-muted)">☆</span>
            <span onclick="setTicketRating(4)" class="customer-star" data-val="4" style="color:var(--text-muted)">☆</span>
            <span onclick="setTicketRating(5)" class="customer-star" data-val="5" style="color:var(--text-muted)">☆</span>
          </div>
          
          <textarea id="ratingComment" class="input" placeholder="Optional comments on experience..." style="min-height:60px; max-width:400px; background:rgba(0,0,0,0.2); font-size:12px; resize:none; border:1px solid var(--line); border-radius:8px; width:100%; color:#fff; outline:none; padding:8px 12px;"></textarea>
          
          <button class="btn btn-primary" onclick="submitTicketRating('${ticket.id}')" style="font-family:var(--font-mono); font-size:10px; padding:10px 24px;">SUBMIT_EVALUATION</button>
        </div>
      `;
    }

    // Input reply section if not closed
    const isClosed = ticket.status === 'CLOSED';
    let replyInputHtml = '';
    if (!isClosed) {
      replyInputHtml = `
        <div style="display:flex; gap:12px; border-top:1px solid rgba(255,255,255,0.06); padding:16px 0 0;">
          <input type="text" id="ticketReplyInput" class="input" placeholder="Transmit reply to support team..." style="flex:1; background:rgba(255,255,255,0.02); outline:none;" onkeydown="handleTicketKeydown(event, '${ticket.id}')">
          <button class="btn btn-primary" onclick="sendTicketMessage('${ticket.id}')" style="padding:12px 20px; font-family:var(--font-mono); font-size:11px;">✦ SEND</button>
        </div>`;
    } else {
      replyInputHtml = `<div style="text-align:center; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; color:var(--text-muted); font-family:var(--font-mono); font-size:10px; margin-top:12px;">// SIGNAL_CHANNEL_CLOSED</div>`;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h4 style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:#fff; margin:0;">#${shortId}</h4>
            <span style="font-family:var(--font-mono); font-size:8px; background:rgba(255,255,255,0.05); padding:1px 5px; border-radius:4px; color:var(--text-muted);">${ticket.category}</span>
          </div>
          <div style="font-size:9.5px; font-family:var(--font-mono); color:var(--text-muted); margin-top:4px;">CREATED: ${new Date(ticket.createdAt).toLocaleString('en-GB')}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-family:var(--font-mono); font-size:9px; font-weight:700; color:${statusColor}; border:1px solid ${statusColor}40; background:${statusColor}0a; padding:3px 8px; border-radius:6px;">${ticket.status}</span>
          <button class="btn btn-ghost btn-sm" onclick="backToTicketsList()" style="font-family:var(--font-mono); font-size:9px;">← LIST</button>
        </div>
      </div>
      
      <!-- Messages thread -->
      <div style="height:300px; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.04); border-radius:10px;" id="ticketChatThread">
        ${messagesHtml}
      </div>

      <!-- Rating prompt if resolved -->
      ${ratingWidgetHtml}
      
      <!-- Send Input -->
      ${replyInputHtml}
    `;

    setTimeout(() => {
      const thread = document.getElementById('ticketChatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }, 100);

  } catch (err) {
    container.innerHTML = `<p class="panel-empty"><span class="panel-empty-icon">⚠</span><br>SIGNAL_LOST: ${err.message}</p>`;
  }
}

function backToTicketsList() {
  activeTicketId = null;
  const url = new URL(window.location);
  url.searchParams.delete('ticketId');
  url.searchParams.delete('action');
  url.searchParams.delete('category');
  window.history.pushState({}, '', url);
  loadSupportTickets();
}

async function sendTicketMessage(ticketId) {
  const input = document.getElementById('ticketReplyInput');
  const content = input.value.trim();
  if (!content) return;

  input.value = '';

  try {
    const res = await API.post(`/support/tickets/${ticketId}/messages`, { content });
    if (res.success) {
      loadSingleTicketView(ticketId);
    }
  } catch (err) {
    Toast.error('Transmission failed.');
  }
}

function handleTicketKeydown(e, ticketId) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendTicketMessage(ticketId);
  }
}

// Client CSAT Star Rating picker logic
let clientSelectedRating = 0;
function setTicketRating(rating) {
  clientSelectedRating = rating;
  const stars = document.querySelectorAll('.customer-star');
  stars.forEach((star, idx) => {
    star.textContent = idx < rating ? '★' : '☆';
    star.style.color = idx < rating ? '#ffc107' : 'var(--text-muted)';
  });
}

async function submitTicketRating(ticketId) {
  const comment = document.getElementById('ratingComment').value.trim();
  if (clientSelectedRating < 1) {
    Toast.error('Please pick a rating value first.');
    return;
  }

  try {
    const res = await API.post(`/support/tickets/${ticketId}/rating`, {
      rating: clientSelectedRating,
      ratingNote: comment
    });
    if (res.success) {
      Toast.success('EVALUATION_SIGNAL_TRANSMITTED');
      loadSingleTicketView(ticketId);
    }
  } catch (err) {
    Toast.error(err.error || 'Feedback transmission failed.');
  }
}

/* ── LOGOUT ── */
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
    });
  }
}

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuthTabs();
  initAuthForms();
  initProfileTabs();
  checkAuthState();
  initLogout();
});