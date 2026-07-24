/* ============================================================ */
/* HUVVSM — ADMIN DASHBOARD SECURITY & LOGIC                   */
/* js/admin.js                                                 */
/* ============================================================ */

function verifyAdminAccess() {
  const user  = Auth.getUser();
  const token = Auth.getToken();
  if (!token || !user || !['ADMIN', 'OWNER'].includes(user.role)) {
    window.location.replace('index.html');
    return false;
  }
  return true;
}

async function initAdminDashboard() {
  if (!verifyAdminAccess()) return;

  // Staff Management is OWNER-only. The backend enforces this at the
  // route level regardless, but we also keep it out of the ADMIN's
  // rendered nav entirely — it should never even appear as an option.
  const user = Auth.getUser();
  if (user.role === 'OWNER') {
    document.querySelectorAll('.owner-only').forEach(el => el.hidden = false);
  }

  try {
    const res = await API.get('/admin/stats');
    if (res.success) renderStats(res.data);
    checkAdminUnreadSupport();
    loadTab('command');   // ← COMMAND_CENTER is now the default landing tab
  } catch (err) {
    if (err.status === 401 || err.status === 403) Auth.logout();
  }
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('staffForm')?.addEventListener('submit', handleStaffSubmit);
  document.getElementById('thresholdForm')?.addEventListener('submit', handleThresholdSubmit);
}

async function checkAdminUnreadSupport() {
  try {
    const res = await API.get('/admin/support/tickets');
    const tickets = res.data || [];
    const hasUnread = tickets.some(t => t.status === 'OPEN' || t.status === 'WAITING_SUPPORT');
    const dot = document.getElementById('adminSupportUnreadDot');
    if (dot) {
      dot.style.display = hasUnread ? 'block' : 'none';
    }
  } catch (err) {
    console.warn('[ADMIN UNREAD CHECK FAILED]', err);
  }
}

function renderStats(data) {
  document.getElementById('stat-users').innerText    = data.counts.users;
  document.getElementById('stat-products').innerText = data.counts.products;
  document.getElementById('stat-cart').innerText     = data.counts.cartActivity;
}

function loadTab(tabName) {
  if (tabName === 'staff' && Auth.getUser()?.role !== 'OWNER') {
    Toast.error('OWNER_ACCESS_REQUIRED');
    return;
  }
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  );
  if      (tabName === 'command')  renderCommandCenter();    // ← NEW
  else if (tabName === 'products') renderProductManagement();
  else if (tabName === 'users')    renderUserManagement();
  else if (tabName === 'orders')   renderOrderManagement();
  else if (tabName === 'feedback') renderFeedbackManagement();
  else if (tabName === 'staff')    renderStaffManagement();  // ← NEW, OWNER only
  else if (tabName === 'rewards')  renderRewardsManagement(); // ← NEW
  else if (tabName === 'support')  renderSupportCenter();
  else if (tabName === 'ai')       renderAdminAI();
  else                             renderSystemParams();
}

/* ============================================================ */
/* COMMAND_CENTER — BUSINESS ANALYTICS                          */
/* ============================================================ */

// Holds Chart.js instances so they can be destroyed on re-render
// (switching away and back to the tab must not cause canvas errors)
const _ccCharts = {};

function _destroyCCCharts() {
  Object.values(_ccCharts).forEach(c => { try { c.destroy(); } catch (_) {} });
  Object.keys(_ccCharts).forEach(k => delete _ccCharts[k]);
}

async function renderCommandCenter() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `<div class="panel-loading">INITIALIZING_COMMAND_CENTER...</div>`;
  _destroyCCCharts();

  try {
    const res = await API.get('/admin/command-center');
    const d   = res.data;
    const yr  = new Date().getFullYear();
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

    /* ── helpers ── */
    const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });

    container.innerHTML = `
      <!-- ── HEADER ── -->
      <div class="admin-table-header">
        <h2 class="label">COMMAND_CENTER</h2>
        <span class="label text-muted" style="font-size:10px;letter-spacing:.12em">${yr}_FISCAL_OVERVIEW</span>
      </div>

      <!-- ── KPI GRID (8 cards) ── -->
      <div class="kpi-grid">

        <div class="kpi-card glass">
          <div class="kpi-label">TOTAL_REVENUE</div>
          <div class="kpi-value kpi-accent-blue">${Format.price(d.revenue.total)}</div>
          <div class="kpi-sub">excl. cancelled orders</div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-label">TOTAL_ORDERS</div>
          <div class="kpi-value">${d.counts.totalOrders}</div>
          <div class="kpi-sub">all time transmissions</div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-label">TOTAL_CUSTOMERS</div>
          <div class="kpi-value">${d.counts.totalUsers}</div>
          <div class="kpi-sub">registered entities</div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-label">TOTAL_PRODUCTS</div>
          <div class="kpi-value">${d.counts.totalProducts}</div>
          <div class="kpi-sub">active specimens</div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-label">AVG_RATING</div>
          <div class="kpi-value kpi-accent-gold">${d.avgRating > 0 ? d.avgRating.toFixed(1) + ' ★' : 'N/A'}</div>
          <div class="kpi-sub">across all feedback</div>
        </div>

        <div class="kpi-card glass kpi-warn">
          <div class="kpi-label">PENDING_ORDERS</div>
          <div class="kpi-value kpi-accent-warn">${d.counts.pendingOrders}</div>
          <div class="kpi-sub">awaiting processing</div>
        </div>

        <div class="kpi-card glass kpi-warn">
          <div class="kpi-label">LOW_STOCK</div>
          <div class="kpi-value kpi-accent-warn">${d.counts.lowStockProducts}</div>
          <div class="kpi-sub">below 5 units</div>
        </div>

        <div class="kpi-card glass kpi-danger">
          <div class="kpi-label">OUT_OF_STOCK</div>
          <div class="kpi-value kpi-accent-danger">${d.counts.outOfStockProducts}</div>
          <div class="kpi-sub">zero units remaining</div>
        </div>

      </div>

      <!-- ── CHARTS ROW 1 ── -->
      <div class="charts-row">

        <div class="chart-box glass">
          <p class="label chart-title">REVENUE_EVOLUTION <span class="chart-year">${yr}</span></p>
          <div style="position:relative;height:260px">
            <canvas id="cc-chart-revenue"></canvas>
          </div>
        </div>

        <div class="chart-box glass">
          <p class="label chart-title">ORDERS_BY_MONTH <span class="chart-year">${yr}</span></p>
          <div style="position:relative;height:260px">
            <canvas id="cc-chart-orders-month"></canvas>
          </div>
        </div>

      </div>

      <!-- ── CHARTS ROW 2 ── -->
      <div class="charts-row">

        <div class="chart-box glass">
          <p class="label chart-title">ORDERS_BY_STATUS</p>
          <div id="cc-status-wrap" style="position:relative;height:260px;display:flex;align-items:center;justify-content:center">
            <canvas id="cc-chart-status" style="max-width:260px;max-height:260px"></canvas>
          </div>
        </div>

        <div class="chart-box glass">
          <p class="label chart-title">BEST_SELLING_SPECIMENS</p>
          <div id="cc-bs-wrap" style="position:relative;height:260px">
            <canvas id="cc-chart-bestsellers"></canvas>
          </div>
        </div>

      </div>

      <!-- ── WIDGETS ROW ── -->
      <div class="cc-widgets">

        <!-- Latest orders -->
        <div class="cc-widget-card glass">
          <p class="label cc-widget-title">LATEST_TRANSMISSIONS</p>
          ${d.latestOrders.length === 0
            ? `<p class="label text-muted" style="font-size:11px;padding:20px 0">NO_ORDERS_YET</p>`
            : `<div class="cc-widget-list">
                ${d.latestOrders.map(o => {
                  const itemCount = o.items.reduce((acc, i) => acc + i.quantity, 0);
                  return `
                  <div class="cc-widget-row">
                    <div>
                      <div style="font-family:var(--font-mono);font-size:10px;color:var(--c1)">#${o.id.slice(0,8).toUpperCase()}</div>
                      <div style="font-size:12px;margin-top:3px;font-weight:600">${o.user?.name || 'UNKNOWN'}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-weight:700;color:var(--c1);font-size:13px">${Format.price(o.total)}</div>
                      <div style="font-size:10px;color:#666;margin-top:2px">${itemCount} unit${itemCount !== 1 ? 's' : ''} · ${fmtDate(o.createdAt)}</div>
                    </div>
                  </div>`;
                }).join('')}
              </div>`
          }
        </div>

        <!-- Recent customers -->
        <div class="cc-widget-card glass">
          <p class="label cc-widget-title">RECENT_ENTITIES</p>
          ${d.recentCustomers.length === 0
            ? `<p class="label text-muted" style="font-size:11px;padding:20px 0">NO_ENTITIES_YET</p>`
            : `<div class="cc-widget-list">
                ${d.recentCustomers.map(u => {
                  const initials = u.name.split(' ').map(w => w[0] || '').join('').slice(0,2).toUpperCase();
                  return `
                  <div class="cc-widget-row">
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="cc-avatar">${initials}</div>
                      <div>
                        <div style="font-weight:600;font-size:12px">${u.name}</div>
                        <div style="font-size:10px;color:#666;margin-top:2px">${u.email}</div>
                      </div>
                    </div>
                    <div style="font-size:10px;color:#555;white-space:nowrap">${fmtDate(u.createdAt)}</div>
                  </div>`;
                }).join('')}
              </div>`
          }
        </div>

        <!-- Low / zero stock alerts -->
        <div class="cc-widget-card glass">
          <p class="label cc-widget-title">STOCK_ALERT_FEED</p>
          ${d.lowStockAlerts.length === 0
            ? `<p class="label" style="font-size:11px;color:#00ff7f;padding:20px 0">ALL_SPECIMENS_NOMINAL</p>`
            : `<div class="cc-widget-list">
                ${d.lowStockAlerts.map(p => {
                  const isZero = p.stock === 0;
                  const img    = (p.images && p.images[0]) ? Format.image(p.images[0]) : '';
                  return `
                  <div class="cc-widget-row">
                    <div style="display:flex;align-items:center;gap:10px">
                      ${img
                        ? `<img src="${img}" style="width:32px;height:38px;object-fit:cover;border-radius:4px;background:#000">`
                        : `<div style="width:32px;height:38px;background:rgba(255,255,255,0.05);border-radius:4px;flex-shrink:0"></div>`
                      }
                      <div style="font-weight:600;font-size:12px">${p.name}</div>
                    </div>
                    <span class="stock-flag ${isZero ? 'stock-flag-zero' : 'stock-flag-low'}">
                      ${isZero ? 'ZERO' : p.stock + ' LEFT'}
                    </span>
                  </div>`;
                }).join('')}
              </div>`
          }
        </div>

        <!-- SUPPORT_OVERVIEW Widget -->
        <div class="cc-widget-card glass" onclick="loadTab('support')" style="cursor:pointer; border-color: rgba(0, 229, 255, 0.15);" onmouseover="this.style.borderColor='rgba(0, 229, 255, 0.4)'" onmouseout="this.style.borderColor='rgba(0, 229, 255, 0.15)'">
          <p class="label cc-widget-title" style="color:var(--c1) !important">🎧 SUPPORT_OVERVIEW</p>
          <div class="cc-widget-list" style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; text-align:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.04); padding-bottom:8px;">
              <div>
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">OPEN</div>
                <div style="font-weight:700; font-size:16px; color:#ff4d6d; margin-top:2px;">${d.supportStats?.openTickets || 0}</div>
              </div>
              <div>
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">WAIT_SUP</div>
                <div style="font-weight:700; font-size:16px; color:#ffc107; margin-top:2px;">${d.supportStats?.waitingSupport || 0}</div>
              </div>
              <div>
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">WAIT_CUST</div>
                <div style="font-weight:700; font-size:16px; color:#00E5FF; margin-top:2px;">${d.supportStats?.waitingCustomer || 0}</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; text-align:center; gap:8px; padding-top:4px;">
              <div>
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">AVG_CSAT</div>
                <div style="font-weight:700; font-size:14px; color:#00ff7f; margin-top:2px;">★ ${d.supportStats?.avgSatisfactionRating ? d.supportStats.avgSatisfactionRating.toFixed(1) : '0.0'}</div>
              </div>
              <div>
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">RESP_TIME</div>
                <div style="font-weight:700; font-size:14px; color:#fff; margin-top:2px;">${d.supportStats?.avgResponseTimeHours ? d.supportStats.avgResponseTimeHours + 'h' : '0.0h'}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Initialize charts now that the canvases are in the DOM
    _initCCCharts(d, MONTHS);

  } catch (err) {
    console.error('[COMMAND_CENTER ERROR]', err);
    document.getElementById('admin-content').innerHTML =
      `<p class="text-error" style="padding:40px">COMMAND_CENTER_OFFLINE — ${err.message || ''}</p>`;
  }
}

/* ── Chart initialization (called after innerHTML is set) ── */
function _initCCCharts(d, months) {
  if (typeof Chart === 'undefined') {
    console.warn('[COMMAND_CENTER] Chart.js not loaded — charts skipped');
    return;
  }

  // Shared scale defaults for a dark cyber aesthetic
  const darkScales = {
    x: {
      grid:  { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#555', font: { family: 'Space Mono', size: 9 } }
    },
    y: {
      grid:  { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#555', font: { family: 'Space Mono', size: 9 } }
    }
  };

  /* ── 1. Revenue by month — LINE ── */
  const revEl = document.getElementById('cc-chart-revenue');
  if (revEl) {
    const ctx  = revEl.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(0,229,255,0.22)');
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    _ccCharts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          data:                d.revenue.byMonth,
          borderColor:         '#00E5FF',
          backgroundColor:     grad,
          tension:             0.4,
          fill:                true,
          pointRadius:         4,
          pointBackgroundColor:'#00E5FF',
          pointBorderColor:    '#050505',
          pointBorderWidth:    2,
          pointHoverRadius:    6
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: darkScales
      }
    });
  }

  /* ── 2. Orders by month — BAR ── */
  const ordMonEl = document.getElementById('cc-chart-orders-month');
  if (ordMonEl) {
    _ccCharts.ordersMonth = new Chart(ordMonEl, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          data:            d.orders.byMonth,
          backgroundColor: 'rgba(139,92,255,0.65)',
          borderColor:     '#8b5cff',
          borderWidth:     1,
          borderRadius:    4
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: darkScales
      }
    });
  }

  /* ── 3. Orders by status — DONUT ── */
  const statusEl = document.getElementById('cc-chart-status');
  const statusData = d.orders.byStatus || {};
  const statusLabels = Object.keys(statusData);

  if (statusEl && statusLabels.length > 0) {
    const STATUS_COLORS = {
      PENDING:   '#ffc107',
      CONFIRMED: '#00E5FF',
      SHIPPED:   '#8b5cff',
      DELIVERED: '#00ff7f',
      CANCELLED: '#ff4d6d'
    };
    _ccCharts.status = new Chart(statusEl, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{
          data:            statusLabels.map(s => statusData[s]),
          backgroundColor: statusLabels.map(s => STATUS_COLORS[s] || '#666'),
          borderColor:     '#050505',
          borderWidth:     3,
          hoverOffset:     6
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '64%',
        plugins: {
          legend: {
            display:  true,
            position: 'bottom',
            labels: {
              color:    '#666',
              font:     { family: 'Space Mono', size: 9 },
              boxWidth: 10,
              padding:  14
            }
          }
        }
      }
    });
  } else if (statusEl && statusLabels.length === 0) {
    document.getElementById('cc-status-wrap').innerHTML =
      `<p class="label text-muted" style="font-size:11px;text-align:center;padding-top:80px">NO_ORDER_DATA</p>`;
  }

  /* ── 4. Best-selling specimens — HORIZONTAL BAR ── */
  const bsEl = document.getElementById('cc-chart-bestsellers');
  if (bsEl && d.bestSellers && d.bestSellers.length > 0) {
    const bsColors = ['rgba(0,229,255,0.7)','rgba(139,92,255,0.7)','rgba(0,229,255,0.5)','rgba(139,92,255,0.5)','rgba(0,229,255,0.3)'];
    const bsBorder = ['#00E5FF','#8b5cff','#00E5FF','#8b5cff','#00E5FF'];
    _ccCharts.bestSellers = new Chart(bsEl, {
      type: 'bar',
      data: {
        labels: d.bestSellers.map(p => p.name.length > 20 ? p.name.slice(0,20) + '…' : p.name),
        datasets: [{
          data:            d.bestSellers.map(p => p.quantity),
          backgroundColor: bsColors,
          borderColor:     bsBorder,
          borderWidth:     1,
          borderRadius:    4
        }]
      },
      options: {
        indexAxis:           'y',
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid:  { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#555', font: { family: 'Space Mono', size: 9 } }
          },
          y: {
            grid:  { display: false },
            ticks: { color: '#ccc', font: { family: 'Space Mono', size: 9 } }
          }
        }
      }
    });
  } else if (bsEl) {
    document.getElementById('cc-bs-wrap').innerHTML =
      `<p class="label text-muted" style="font-size:11px;text-align:center;padding-top:80px">NO_SALES_DATA</p>`;
  }
}

/* ============================================================ */
/* PRODUCTS                                                     */
/* ============================================================ */

async function renderProductManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-table-header">
      <div><h2 class="label">INVENTORY_CONTROL</h2></div>
      <button class="btn btn-primary btn-sm" onclick="showProductModal()">+ ADD PRODUCT</button>
    </div>
    <div id="inventory-status"></div>
    <div id="inventory-table-container"></div>
  `;

  try {
    const res      = await API.get('/products');
    const products = res.data || [];
    const tableEl  = document.getElementById('inventory-table-container');

    if (products.length === 0) {
      tableEl.innerHTML = `<div class="empty-state glass" style="padding:40px;text-align:center"><p class="label">NO_SPECIMENS</p></div>`;
      return;
    }

    tableEl.innerHTML = `
      <div class="admin-table-wrap glass">
        <table class="admin-table">
          <thead><tr><th>VISUAL</th><th>NAME</th><th>PRICE</th><th>STOCK</th><th>ACTIONS</th></tr></thead>
          <tbody>
            ${products.map(p => {
              const stockClass = p.stock === 0 ? 'stock-row-zero' : p.stock < 5 ? 'stock-row-low' : '';
              // Build per-size chips for display
              const sizeChips = p.sizeStock
                ? Object.entries(p.sizeStock).map(([sz, qty]) => {
                    const cls = qty === 0 ? 'size-chip-oos' : qty < 3 ? 'size-chip-low' : 'size-chip-ok';
                    return `<span class="size-chip ${cls}">${sz}:${qty}</span>`;
                  }).join('')
                : `<span style="font-size:11px;opacity:0.5">—</span>`;
              return `
              <tr class="${stockClass}">
                <td><img src="${Format.image((p.images && p.images[0]) ? p.images[0] : '')}" class="prod-thumb"></td>
                <td style="font-weight:600">${p.name}</td>
                <td>${Format.price(p.price)}</td>
                <td>
                  <div class="size-chips-row">${sizeChips}</div>
                  <div class="stock-edit-cell" style="margin-top:6px">
                    <span style="font-family:var(--font-mono);font-size:10px;opacity:0.5">TOTAL:</span>
                    <span style="font-family:var(--font-mono);font-size:12px;font-weight:700">${p.stock}</span>
                    ${p.stock === 0 ? `<span class="stock-flag stock-flag-zero">ZERO</span>` : p.stock < 5 ? `<span class="stock-flag stock-flag-low">LOW</span>` : ''}
                  </div>
                </td>
                <td class="actions">
                  <button class="icon-btn" onclick="showProductModal('${p.id}')">✎</button>
                  <button class="icon-btn text-error" onclick="deleteProduct('${p.id}')">✕</button>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    document.getElementById('inventory-status').innerHTML = `<p class="text-error">DATABASE_OFFLINE</p>`;
  }
}

function showProductModal(id = null) {
  const modal = document.getElementById('productModal');
  const form  = document.getElementById('productForm');
  form.reset();

  [1, 2, 3, 4].forEach(idx => {
    document.getElementById(`preview${idx}`).style.display     = 'none';
    document.getElementById(`placeholder${idx}`).style.display = 'block';
    document.getElementById(`fileName${idx}`).innerText         = '';
  });

  // Reset size stock inputs
  ['S','M','L','XL'].forEach(s => {
    const el = document.getElementById(`sizeStock_${s}`);
    if (el) el.value = 0;
  });
  const totalEl = document.getElementById('sizeTotalDisplay');
  if (totalEl) totalEl.textContent = '0';

  document.getElementById('prodId').value       = id || '';
  document.getElementById('modalTitle').innerText = id ? 'EDIT PRODUCT' : 'ADD PRODUCT';

  if (id) {
    API.get(`/products/${id}`).then(res => {
      const p = res.data;
      document.getElementById('prodName').value     = p.name;
      document.getElementById('prodPrice').value    = p.price;
      document.getElementById('prodCategory').value = p.category;
      if (document.getElementById('prodTag')) document.getElementById('prodTag').value = p.tag || '';
      document.getElementById('prodDesc').value     = p.description;

      // Populate per-size stock inputs
      const ss = p.sizeStock || {};
      let total = 0;
      ['S','M','L','XL'].forEach(s => {
        const el = document.getElementById(`sizeStock_${s}`);
        if (el) {
          el.value = ss[s] !== undefined ? ss[s] : 0;
          total += parseInt(el.value) || 0;
        }
      });
      if (totalEl) totalEl.textContent = total;

      p.images.forEach((img, idx) => {
        if (img && idx < 4) {
          const previewEl = document.getElementById(`preview${idx + 1}`);
          previewEl.querySelector('img').src   = img;
          previewEl.style.display              = 'block';
          document.getElementById(`placeholder${idx + 1}`).style.display = 'none';
        }
      });
    });
  }

  // Live total counter — use oninput directly to avoid stacking listeners on each modal open
  ['S','M','L','XL'].forEach(s => {
    const el = document.getElementById(`sizeStock_${s}`);
    if (el) el.oninput = () => {
      let t = 0;
      ['S','M','L','XL'].forEach(sz => {
        t += parseInt(document.getElementById(`sizeStock_${sz}`)?.value) || 0;
      });
      if (totalEl) totalEl.textContent = t;
    };
  });

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const bind = (inputId, prevId, placeId, labelId) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById(labelId).innerText = file.name;
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById(prevId).querySelector('img').src = ev.target.result;
          document.getElementById(prevId).style.display            = 'block';
          document.getElementById(placeId).style.display           = 'none';
        };
        reader.readAsDataURL(file);
      }
    };
  };

  [1, 2, 3, 4].forEach(idx => {
    bind(`prodImage${idx}`, `preview${idx}`, `placeholder${idx}`, `fileName${idx}`);
  });
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const name     = document.getElementById('prodName')?.value.trim();
  const price    = document.getElementById('prodPrice')?.value.trim();
  const category = document.getElementById('prodCategory')?.value;
  const desc     = document.getElementById('prodDesc')?.value.trim();

  // Manual validation — HTML5 required can't show tooltips inside CSS-transformed modals
  if (!name) { Toast.error('SPECIMEN_IDENTIFIER required'); return; }
  if (!price || isNaN(parseFloat(price))) { Toast.error('VALUATION required'); return; }
  if (!category) { Toast.error('CLASSIFICATION required'); return; }

  const submitBtn = document.querySelector('#productForm button[type="submit"]');
  const origLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'COMMITTING...'; }

  const id       = document.getElementById('prodId').value;
  const formData = new FormData();

  formData.append('name',        name);
  formData.append('price',       price);
  formData.append('category',    category);
  formData.append('description', desc || '');
  const tagVal = document.getElementById('prodTag')?.value.trim();
  if (tagVal) formData.append('tag', tagVal);

  // Build sizeStock JSON from per-size inputs
  const sizeStock = {};
  ['S','M','L','XL'].forEach(s => {
    const val = parseInt(document.getElementById(`sizeStock_${s}`)?.value) || 0;
    sizeStock[s] = val;
  });
  formData.append('sizeStock', JSON.stringify(sizeStock));

  [1, 2, 3, 4].forEach(idx => {
    const fileInput = document.getElementById(`prodImage${idx}`);
    if (fileInput && fileInput.files[0]) formData.append(`image${idx}`, fileInput.files[0]);
  });

  try {
    const url    = id ? `${API.BASE}/products/${id}` : `${API.BASE}/products`;
    const method = id ? 'PATCH' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
      body: formData
    });

    let result;
    try {
      result = await res.json();
    } catch (_) {
      // Backend returned non-JSON (e.g. HTML error page)
      throw new Error(`Server returned HTTP ${res.status} ${res.statusText} (non-JSON response). Check backend is running.`);
    }

    console.log('[PRODUCT SUBMIT] HTTP', res.status, result);

    if (result.success) {
      Toast.success(id ? 'SPECIMEN_UPDATED' : 'SIGNAL_COMMITTED');
      closeProductModal();
      renderProductManagement();
    } else {
      Toast.error(result.error || 'COMMIT_FAILED');
    }
  } catch (err) {
    console.error('[PRODUCT SUBMIT ERROR]', err);
    Toast.error(err.message || 'CONNECTION_LOST');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
  }
}

async function deleteProduct(id) {
  Modal.open('confirmDeleteProductModal');
  document.getElementById('confirmDeleteProductBtn').onclick = async () => {
    Modal.close('confirmDeleteProductModal');
    try {
      await API.delete(`/products/${id}`);
      Toast.success('SPECIMEN_DELETED');
      renderProductManagement();
    } catch (err) { Toast.error('FAILED'); }
  };
}

async function updateProductStock(id) {
  const input = document.getElementById(`stock-input-${id}`);
  if (!input) return;

  const newStock = parseInt(input.value);
  if (isNaN(newStock) || newStock < 0) {
    Toast.error('INVALID_STOCK_VALUE');
    return;
  }

  try {
    await API.patch(`/products/${id}/stock`, { stock: newStock });
    Toast.success('STOCK_UPDATED');
    renderProductManagement();
  } catch (err) {
    Toast.error(err.error || err.message || 'STOCK_UPDATE_FAILED');
  }
}

/* ============================================================ */
/* USERS                                                        */
/* ============================================================ */

async function renderUserManagement() {
  const container = document.getElementById('admin-content');
  try {
    const res = await API.get('/admin/users');
    container.innerHTML = `
      <div class="admin-table-header"><h2 class="label">ENTITY_LOGS</h2></div>
      <div class="admin-table-wrap glass">
        <table class="admin-table">
          <thead><tr><th>ENTITY</th><th>EMAIL</th><th>ACTIONS</th></tr></thead>
          <tbody>
            ${res.data.map(u => `
              <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td class="actions">
                  ${u.role === 'USER'
                    ? `<button class="icon-btn text-error" onclick="deleteUser('${u.id}')">✕</button>`
                    : u.role
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { container.innerHTML = `<p class="text-error">FAILURE</p>`; }
}

async function deleteUser(id) {
  if (!confirm('TERMINATE?')) return;
  try {
    await API.delete(`/admin/users/${id}`);
    Toast.success('TERMINATED');
    renderUserManagement();
  } catch (err) { Toast.error('FAILED'); }
}

/* ============================================================ */
/* STAFF_MANAGEMENT — OWNER ONLY                                 */
/* ============================================================ */

// Holds full staff list so the client-side search can filter it
// without re-fetching from the server.
let _staffData = [];

async function renderStaffManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `<div class="panel-loading">LOADING_STAFF_REGISTRY...</div>`;

  try {
    // Fetch stats + staff list in parallel for speed
    const [statsRes, staffRes] = await Promise.all([
      API.get('/staff/stats'),
      API.get('/staff')
    ]);

    const stats = statsRes.data;
    _staffData  = staffRes.data;

    container.innerHTML = `
      <!-- ── HEADER ── -->
      <div class="admin-table-header">
        <h2 class="label">STAFF_MANAGEMENT</h2>
        <button class="btn btn-primary btn-sm" onclick="openStaffModal()">+ ADD_ADMIN</button>
      </div>

      <!-- ── STATISTICS ── -->
      <div class="staff-stats-row">
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-total">🛡</div>
          <div class="ssc-body">
            <div class="ssc-value" id="staff-stat-total">${stats.total}</div>
            <div class="ssc-label">Total Admins</div>
          </div>
        </div>
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-active">▶</div>
          <div class="ssc-body">
            <div class="ssc-value" id="staff-stat-active">${stats.active}</div>
            <div class="ssc-label">Active Admins</div>
          </div>
        </div>
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-suspend">⏸</div>
          <div class="ssc-body">
            <div class="ssc-value" id="staff-stat-suspended">${stats.suspended}</div>
            <div class="ssc-label">Suspended Admins</div>
          </div>
        </div>
      </div>

      <!-- ── SEARCH ── -->
      <div class="staff-search-wrap">
        <span class="search-icon">◈</span>
        <input
          type="text"
          id="staff-search"
          class="staff-search-input"
          placeholder="SEARCH_BY_NAME_OR_EMAIL..."
          oninput="filterStaff(this.value)"
          autocomplete="off"
        >
      </div>

      <!-- ── TABLE ── -->
      <div id="staff-table-wrap"></div>
    `;

    // Render the table initially with all staff
    renderStaffTable(_staffData);

  } catch (err) {
    container.innerHTML = `<p class="text-error" style="padding:40px">STAFF_REGISTRY_OFFLINE — ${err.error || err.message || ''}</p>`;
  }
}

function renderStaffTable(list) {
  const wrap = document.getElementById('staff-table-wrap');
  if (!wrap) return;

  const fmtLogin = iso => {
    if (!iso) return `<span class="staff-never-login">Never Logged In</span>`;
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (list.length === 0) {
    wrap.innerHTML = `
      <div class="admin-table-wrap glass">
        <div style="text-align:center;padding:60px 20px;">
          <p class="label text-muted" style="font-size:11px;letter-spacing:.14em">
            NO_STAFF_ACCOUNTS_MATCH_QUERY
          </p>
        </div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="admin-table-wrap glass">
      <table class="admin-table">
        <thead>
          <tr>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>STATUS</th>
            <th>LAST_LOGIN</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(s => `
            <tr>
              <td style="font-weight:600">${s.name}</td>
              <td style="font-family:var(--font-mono);font-size:11px;color:#aaa">${s.email}</td>
              <td>
                <span class="status-pill status-${s.isActive ? 'DELIVERED' : 'CANCELLED'}">
                  ${s.isActive ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </td>
              <td class="staff-login-col">${fmtLogin(s.lastLogin)}</td>
              <td class="staff-actions-col actions" style="display:flex;gap:8px;align-items:center">
                <button class="icon-btn" title="Edit" onclick='openStaffModal(${JSON.stringify({ id: s.id, name: s.name, email: s.email })})'>&#10002;</button>
                <button
                  class="icon-btn ${s.isActive ? 'text-error' : ''}"
                  title="${s.isActive ? 'Suspend' : 'Reactivate'}"
                  onclick="toggleStaffStatus('${s.id}', ${!s.isActive})"
                >${s.isActive ? '⏸' : '▶'}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Client-side search — filters the already-fetched _staffData array
function filterStaff(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    renderStaffTable(_staffData);
    return;
  }
  const filtered = _staffData.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.email.toLowerCase().includes(q)
  );
  renderStaffTable(filtered);
}

function openStaffModal(staff) {
  const isEdit = !!staff;
  document.getElementById('staffModalTitle').innerText = isEdit ? 'EDIT ADMIN' : 'ADD ADMIN';
  document.getElementById('staffId').value       = isEdit ? staff.id   : '';
  document.getElementById('staffName').value     = isEdit ? staff.name  : '';
  document.getElementById('staffEmail').value    = isEdit ? staff.email : '';
  document.getElementById('staffPassword').value = '';
  document.getElementById('staffPassword').placeholder = isEdit ? 'Leave blank to keep current password' : 'Minimum 8 characters';
  document.getElementById('staffPassword').required = !isEdit;
  Modal.open('staffModal');
}

function closeStaffModal() {
  Modal.close('staffModal');
}

async function handleStaffSubmit(e) {
  e.preventDefault();
  const id       = document.getElementById('staffId').value;
  const name     = document.getElementById('staffName').value;
  const email    = document.getElementById('staffEmail').value;
  const password = document.getElementById('staffPassword').value;

  if (!id) {
    // New admin — show confirmation modal first
    if (!password || password.length < 8) {
      Toast.error('PASSWORD_MIN_8_CHARS');
      return;
    }
    closeStaffModal();
    Modal.open('confirmCreateModal');
    document.getElementById('confirmCreateBtn').onclick = async () => {
      Modal.close('confirmCreateModal');
      try {
        await API.post('/staff', { name, email, password });
        Toast.success('ADMIN_CREATED');
        renderStaffManagement();
      } catch (err) {
        Toast.error(err.error || err.message || 'COMMIT_FAILED');
      }
    };
  } else {
    // Edit — no confirmation needed for non-destructive changes
    try {
      await API.patch(`/staff/${id}`, { name, email });
      Toast.success('ADMIN_UPDATED');
      closeStaffModal();
      renderStaffManagement();
    } catch (err) {
      Toast.error(err.error || err.message || 'COMMIT_FAILED');
    }
  }
}

function toggleStaffStatus(id, nextActive) {
  const modalId = nextActive ? 'confirmActivateModal' : 'confirmSuspendModal';
  const btnId   = nextActive ? 'confirmActivateBtn'   : 'confirmSuspendBtn';

  Modal.open(modalId);

  document.getElementById(btnId).onclick = async () => {
    Modal.close(modalId);
    try {
      await API.patch(`/staff/${id}/status`, { isActive: nextActive });
      Toast.success(nextActive ? 'ADMIN_REACTIVATED' : 'ADMIN_SUSPENDED');
      renderStaffManagement();
    } catch (err) {
      Toast.error(err.error || err.message || 'STATUS_UPDATE_FAILED');
    }
  };
}


/* ============================================================ */
/* ORDERS — SIGNAL_HISTORY                                      */
/* ============================================================ */

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

async function renderOrderManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-table-header"><h2 class="label">SIGNAL_HISTORY</h2></div>
    <div id="orders-container"><div class="panel-loading">FETCHING_TRANSMISSIONS...</div></div>
  `;

  try {
    const res    = await API.get('/admin/orders');
    const orders = res.data || [];
    const target = document.getElementById('orders-container');

    if (orders.length === 0) {
      target.innerHTML = `<div class="empty-state glass" style="padding:60px;text-align:center"><p class="label">NO_ORDERS</p></div>`;
      return;
    }

    target.innerHTML = `
      <div class="admin-table-wrap glass">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ORDER_ID</th>
              <th>CUSTOMER_INFO</th>
              <th>DESTINATION</th>
              <th>ITEMS</th>
              <th>TOTAL</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => {
              const shortId      = order.id.slice(0, 8).toUpperCase();
              const itemsSummary = order.items.map(it => `${it.product?.name || 'UNKNOWN'} ×${it.quantity}`).join(', ');
              const date         = new Date(order.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
              return `
                <tr>
                  <td style="font-family:var(--font-mono);font-size:11px;color:var(--c2)">
                    #${shortId}
                    <div style="font-size:9px;margin-top:4px;color:var(--text-muted)">${date}</div>
                  </td>
                  <td>
                    <div style="font-weight:600">${order.user?.name || 'UNKNOWN'}</div>
                    <div style="font-size:10px;margin-top:2px;color:var(--text-muted)">${order.user?.email || ''}</div>
                  </td>
                  <td>
                    <div style="font-size:11px;line-height:1.4">${order.address || 'NO_ADDRESS'}</div>
                    <div style="font-size:10px;color:var(--c2);margin-top:2px">${order.city || ''}</div>
                  </td>
                  <td style="max-width:200px">
                    <span style="font-size:12px; line-height:1.4; color:var(--text-muted); white-space:normal;">${itemsSummary}</span>
                  </td>
                  <td style="font-weight:700;color:var(--c1)">${Format.price(order.total)}</td>
                  <td>
                    <select class="status-select status-${order.status}" onchange="updateOrderStatus('${order.id}', this.value, this)">
                      ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('[ORDERS FETCH ERROR]', err);
    document.getElementById('orders-container').innerHTML = `<p class="text-error">DATABASE_OFFLINE</p>`;
  }
}

async function updateOrderStatus(orderId, newStatus, selectEl) {
  const prevClass = Array.from(selectEl.classList).find(c => c.startsWith('status-') && c !== 'status-select');
  try {
    await API.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
    if (prevClass) selectEl.classList.remove(prevClass);
    selectEl.classList.add(`status-${newStatus}`);
    Toast.success(`ORDER_${orderId.slice(0,8).toUpperCase()}_SET_TO_${newStatus}`);
  } catch (err) {
    Toast.error('STATUS_UPDATE_FAILED');
    console.error(err);
  }
}

/* ============================================================ */
/* FEEDBACK MODERATION                                          */
/* ============================================================ */

async function renderFeedbackManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-table-header"><h2 class="label">SIGNAL_FEEDBACK_MODERATION</h2></div>
    <div id="feedback-container"><div class="panel-loading">FETCHING_TRANSMISSIONS...</div></div>
  `;

  try {
    const res     = await API.get('/admin/reviews');
    const reviews = res.data || [];
    const target  = document.getElementById('feedback-container');

    if (reviews.length === 0) {
      target.innerHTML = `<div class="empty-state glass" style="padding:60px;text-align:center"><p class="label">NO_FEEDBACK_RECEIVED</p></div>`;
      return;
    }

    target.innerHTML = `
      <div class="admin-table-wrap glass">
        <table class="admin-table">
          <thead>
            <tr>
              <th>SPECIMEN</th><th>USER</th><th>RATING</th><th>COMMENT</th><th>DATE</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${reviews.map(r => {
              const date       = new Date(r.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
              const stars      = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
              const productImg = (r.product?.images && r.product.images.length > 0)
                ? Format.image(r.product.images[0]) : '';
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${productImg ? `<img src="${productImg}" class="prod-thumb" style="width:36px;height:36px">` : ''}
                      <span style="font-weight:600;font-size:12px">${r.product?.name || 'UNKNOWN'}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:600;font-size:12px">${r.user?.name || 'ANON'}</div>
                    <div class="label text-muted" style="font-size:10px">${r.user?.email || ''}</div>
                  </td>
                  <td style="color:#ffc107;letter-spacing:1px;white-space:nowrap">${stars}</td>
                  <td style="max-width:280px">
                    <span style="font-size:12px; line-height:1.5; color:var(--text-muted); white-space:normal;">
                      ${r.comment ? escapeHtmlAdmin(r.comment) : '<em>No comment</em>'}
                    </span>
                  </td>
                  <td class="label text-muted" style="font-size:11px;white-space:nowrap">${date}</td>
                  <td class="actions">
                    <button class="icon-btn text-error" onclick="deleteReview('${r.id}')" title="Remove">✕</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('[FEEDBACK FETCH ERROR]', err);
    document.getElementById('feedback-container').innerHTML = `<p class="text-error">DATABASE_OFFLINE</p>`;
  }
}

async function deleteReview(id) {
  Modal.open('confirmDeleteFeedbackModal');
  document.getElementById('confirmDeleteFeedbackBtn').onclick = async () => {
    Modal.close('confirmDeleteFeedbackModal');
    try {
      await API.delete(`/admin/reviews/${id}`);
      Toast.success('SIGNAL_PURGED');
      renderFeedbackManagement();
    } catch (err) {
      Toast.error('FAILED');
    }
  };
}

function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================ */
/* SYSTEM PARAMS                                                */
/* ============================================================ */

function renderSystemParams() {
  const container = document.getElementById('admin-content');
  const user      = Auth.getUser();

  container.innerHTML = `
    <div class="admin-table-header"><h2 class="label">SYSTEM_PARAMS</h2></div>

    <div class="settings-grid">

      <div class="settings-card glass">
        <h3 class="label">ADMIN_IDENTITY</h3>
        <div class="settings-row">
          <span class="settings-key">NAME</span>
          <span class="settings-val">${user?.name || '—'}</span>
        </div>
        <div class="settings-row">
          <span class="settings-key">EMAIL</span>
          <span class="settings-val">${user?.email || '—'}</span>
        </div>
        <div class="settings-row">
          <span class="settings-key">ACCESS_LEVEL</span>
          <span class="settings-val" style="color:#00ff7f">${user?.role || '—'}</span>
        </div>
      </div>

      <div class="settings-card glass">
        <h3 class="label">CORE_SYSTEM</h3>
        <div class="settings-row">
          <span class="settings-key">API_ENDPOINT</span>
          <span class="settings-val" style="font-size:11px">${API.BASE}</span>
        </div>
        <div class="settings-row">
          <span class="settings-key">SIGNAL_STATUS</span>
          <span class="settings-val" style="color:#00ff7f;display:flex;align-items:center;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:#00ff7f;box-shadow:0 0 8px #00ff7f"></span>
            ONLINE
          </span>
        </div>
        <div class="settings-row">
          <span class="settings-key">SYSTEM_VERSION</span>
          <span class="settings-val">V4.8</span>
        </div>
      </div>

      <div class="settings-card glass">
        <h3 class="label">ORDER_STATUS_REFERENCE</h3>
        <div class="status-legend">
          <span class="status-pill status-PENDING">PENDING</span>
          <span class="status-pill status-CONFIRMED">CONFIRMED</span>
          <span class="status-pill status-SHIPPED">SHIPPED</span>
          <span class="status-pill status-DELIVERED">DELIVERED</span>
          <span class="status-pill status-CANCELLED">CANCELLED</span>
        </div>
        <p class="label text-muted" style="font-size:11px;line-height:1.6;margin-top:16px">
          Update order status from the SIGNAL_HISTORY tab. Customers see this status reflected in their order history in real time.
        </p>
      </div>

      <div class="settings-card glass" style="border-color:rgba(255,77,109,0.2)">
        <h3 class="label" style="color:#ff4d6d">SESSION_CONTROL</h3>
        <p class="label text-muted" style="font-size:11px;line-height:1.6;margin-bottom:20px">
          Terminate your current admin session. You will be redirected to the login gateway.
        </p>
        <button class="btn btn-ghost btn-sm" style="border-color:rgba(255,77,109,0.3);color:#ff4d6d" onclick="Auth.logout()">
          TERMINATE_SESSION
        </button>
      </div>

    </div>
  `;
}

/* ============================================================ */
/* REWARDS_MANAGEMENT — LOYALTY ECOSYSTEM MODULE                 */
/* ============================================================ */

async function renderRewardsManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `<div class="panel-loading">INITIALIZING_REWARDS_CONTROL...</div>`;

  try {
    const res = await API.get('/admin/rewards');
    const d = res.data;

    container.innerHTML = `
      <div class="admin-table-header">
        <h2 class="label">REWARDS_MANAGEMENT</h2>
        <span class="label text-muted" style="font-size:10px;letter-spacing:.12em">LOYALTY_DASHBOARD</span>
      </div>

      <!-- ── STATISTICS HUD ── -->
      <div class="staff-stats-row" style="margin-bottom:24px;">
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-total">✦</div>
          <div class="ssc-body">
            <div class="ssc-value">${d.stats.totalPointsDistributed}</div>
            <div class="ssc-label">Points Distributed</div>
          </div>
        </div>
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-active">🎟</div>
          <div class="ssc-body">
            <div class="ssc-value">${d.stats.activeCouponsCount}</div>
            <div class="ssc-label">Active Coupons</div>
          </div>
        </div>
        <div class="staff-stat-card">
          <div class="ssc-icon ssc-icon-suspend">✓</div>
          <div class="ssc-body">
            <div class="ssc-value">${d.stats.redeemedCouponsCount}</div>
            <div class="ssc-label">Redeemed Coupons</div>
          </div>
        </div>
      </div>

      <!-- ── CONFIG & THRESHOLDS ROW ── -->
      <div class="settings-grid" style="margin-bottom:24px;">
        <!-- Conversion Config -->
        <div class="settings-card glass">
          <h3 class="label">CONVERSION_RULE</h3>
          <div style="margin-top:16px;">
            <div class="field-group" style="margin-bottom:20px;">
              <label style="font-family:'Space Mono'; font-size:10px; color:#888;">POINT_VALUATION (1 POINT = X DH)</label>
              <input type="number" id="dhPerPointConfig" class="input-luxury" value="${d.config.dhPerPoint}" min="1" required style="margin-top:8px;">
            </div>
            <button class="btn btn-primary btn-sm w-full" onclick="updateConversionRate()" style="height:44px; border-radius:10px;">COMMIT_CONVERSION_RATE</button>
          </div>
        </div>

        <!-- Thresholds Config -->
        <div class="settings-card glass">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="label" style="margin:0;">REWARD_THRESHOLDS</h3>
            <button class="btn btn-ghost btn-sm" onclick="openThresholdModal()" style="font-size:9px; padding:6px 12px;">+ ADD_RULE</button>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${d.thresholds.length === 0 
              ? `<p class="label text-muted" style="font-size:10px; text-align:center; padding:15px 0;">NO_THRESHOLDS_CONFIGURED</p>`
              : d.thresholds.map(t => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.04); border-radius:8px;">
                  <div>
                    <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:#00E5FF;">${t.pointsNeeded} PTS</span>
                    <span style="font-family:var(--font-mono); font-size:10px; color:#555; margin-left:8px;">⟶</span>
                    <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:#8b5cff; margin-left:8px;">${t.discountPercent}% OFF</span>
                  </div>
                  <button class="icon-btn text-error" onclick="deleteThreshold('${t.id}')" title="Delete threshold">✕</button>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>

      <!-- ── CUSTOMERS & COUPONS TABLES ── -->
      <div class="charts-row" style="margin-bottom:24px;">
        <!-- Top Customers -->
        <div class="chart-box glass" style="display:flex; flex-direction:column; min-height:350px;">
          <p class="label chart-title">TOP_LOYAL_ENTITIES</p>
          <div style="flex:1; overflow-x:auto;">
            <table class="admin-table" style="font-size:11.5px;">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>BALANCE</th>
                  <th>ESTABLISHED</th>
                </tr>
              </thead>
              <tbody>
                ${d.topCustomers.length === 0
                  ? `<tr><td colspan="3" class="text-muted" style="text-align:center; padding:30px 0;">NO_LOYAL_CUSTOMERS_YET</td></tr>`
                  : d.topCustomers.map(tc => `
                    <tr>
                      <td style="font-weight:600;">
                        ${tc.name}
                        <div class="label text-muted" style="font-size:8px; margin-top:2px;">${tc.email}</div>
                      </td>
                      <td style="font-family:var(--font-mono); font-weight:700; color:#00E5FF;">${tc.points} PTS</td>
                      <td class="label text-muted" style="font-size:10px;">${new Date(tc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Generated/Redeemed Coupons Logs -->
        <div class="chart-box glass" style="display:flex; flex-direction:column; min-height:350px;">
          <p class="label chart-title">COUPON_CREDENTIAL_LEDGER</p>
          <div style="flex:1; overflow-x:auto;">
            <table class="admin-table" style="font-size:11.5px;">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>CUSTOMER</th>
                  <th>DISCOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${d.coupons.length === 0
                  ? `<tr><td colspan="4" class="text-muted" style="text-align:center; padding:30px 0;">NO_COUPONS_LEDGER_ENTRIES</td></tr>`
                  : d.coupons.map(c => {
                      const isExpired = new Date(c.expiresAt) < new Date();
                      let statusHtml = '';
                      if (c.isRedeemed) {
                        statusHtml = `<span class="status-pill status-DELIVERED" style="font-size:8px; padding:3px 8px;" title="Order ID: #${c.order?.id?.slice(0,8)}">REDEEMED</span>`;
                      } else if (isExpired) {
                        statusHtml = `<span class="status-pill status-CANCELLED" style="font-size:8px; padding:3px 8px;">EXPIRED</span>`;
                      } else {
                        statusHtml = `<span class="status-pill status-CONFIRMED" style="font-size:8px; padding:3px 8px;">ACTIVE</span>`;
                      }
                      return `
                        <tr>
                          <td style="font-family:var(--font-mono); font-weight:700; color:#00E5FF;">${c.code}</td>
                          <td>
                            <div style="font-weight:600;">${c.user?.name || 'UNKNOWN'}</div>
                            <div class="label text-muted" style="font-size:8px; margin-top:2px;">${c.user?.email || ''}</div>
                          </td>
                          <td style="font-family:var(--font-mono); color:#8b5cff; font-weight:700;">${c.discountPercent}%</td>
                          <td>${statusHtml}</td>
                        </tr>
                      `;
                    }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('[REWARDS MGMT LOAD ERROR]', err);
    container.innerHTML = `<p class="text-error" style="padding:40px">REWARDS_MGMT_OFFLINE — ${err.message || ''}</p>`;
  }
}

async function updateConversionRate() {
  const dhPerPointInput = document.getElementById('dhPerPointConfig');
  if (!dhPerPointInput) return;
  const val = parseInt(dhPerPointInput.value);

  if (isNaN(val) || val <= 0) {
    Toast.error('INVALID_CONVERSION_RATE');
    return;
  }

  try {
    await API.post('/admin/rewards/config', { dhPerPoint: val });
    Toast.success('CONVERSION_RATE_COMMITTED');
    renderRewardsManagement();
  } catch (err) {
    Toast.error(err.error || err.message || 'UPDATE_FAILED');
  }
}

function openThresholdModal() {
  document.getElementById('thresholdPoints').value = '';
  document.getElementById('thresholdDiscount').value = '';
  Modal.open('thresholdModal');
}

function closeThresholdModal() {
  Modal.close('thresholdModal');
}

async function handleThresholdSubmit(e) {
  e.preventDefault();
  const points = parseInt(document.getElementById('thresholdPoints').value);
  const discount = parseFloat(document.getElementById('thresholdDiscount').value);

  try {
    await API.post('/admin/rewards/thresholds', {
      pointsNeeded: points,
      discountPercent: discount
    });
    Toast.success('THRESHOLD_RULE_COMMITTED');
    closeThresholdModal();
    renderRewardsManagement();
  } catch (err) {
    Toast.error(err.error || err.message || 'RULE_COMMIT_FAILED');
  }
}

async function deleteThreshold(id) {
  if (!confirm('DELETE_THIS_THRESHOLD_RULE?')) return;
  try {
    await API.delete(`/admin/rewards/thresholds/${id}`);
    Toast.success('THRESHOLD_RULE_REMOVED');
    renderRewardsManagement();
  } catch (err) {
    Toast.error(err.error || err.message || 'DELETION_FAILED');
  }
}


/* ============================================================ */
/* HUVVSM V2 — ADMIN SUPPORT CENTER CONTROLS                    */
/* ============================================================ */

let activeAdminSupportTicketId = null;
let activeSupportFilterStatus = 'OPEN';
let currentSuggestions = [];

async function renderSupportCenter() {
  // Inject styles once
  if (!document.getElementById('sc-styles')) {
    const s = document.createElement('style');
    s.id = 'sc-styles';
    s.textContent = `
      #scGrid {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 20px;
        height: calc(100vh - 160px);
        margin-top: 15px;
        min-height: 600px;
        transition: grid-template-columns 0.35s cubic-bezier(.4,0,.2,1);
      }
      #scGrid.sc-compact {
        grid-template-columns: 76px 1fr;
      }
      #scLeftPanel {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--admin-border);
        border-radius: 20px;
        background: var(--admin-panel);
        overflow: hidden;
        transition: all 0.35s cubic-bezier(.4,0,.2,1);
      }
      #scFilterBar {
        display: flex;
        border-bottom: 1px solid var(--admin-border);
        background: rgba(0,0,0,0.1);
        padding: 8px;
        overflow: hidden;
        transition: all 0.35s ease;
        max-height: 60px;
        opacity: 1;
      }
      #scGrid.sc-compact #scFilterBar {
        max-height: 0;
        padding: 0;
        opacity: 0;
      }
      #adminSupportTicketsList {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        scrollbar-width: none;
      }
      /* Avatar circle ticket cards (compact mode) */
      .sc-avatar-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Space Mono', monospace;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        margin: 0 auto;
        flex-shrink: 0;
      }
      .sc-avatar-btn:hover { transform: scale(1.08); }
      .sc-avatar-btn.sc-active {
        box-shadow: 0 0 0 3px var(--c1), 0 0 14px rgba(0,229,255,0.35);
        border-color: var(--c1);
      }
      .sc-avatar-btn .sc-prio-dot {
        position: absolute;
        bottom: 2px; right: 2px;
        width: 10px; height: 10px;
        border-radius: 50%;
        border: 2px solid #0a0c1a;
      }
      /* Ticket detail inner layout */
      #scTicketDetail {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      #scConvoWrap {
        display: grid;
        grid-template-columns: 1fr 270px;
        gap: 16px;
        flex: 1;
        min-height: 0;
      }
      #scChatCol {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      #adminTicketChatThread {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(0,0,0,0.15);
        border: 1px solid var(--admin-border);
        border-radius: 12px;
        margin-bottom: 10px;
      }
      #scMetaCol {
        display: flex;
        flex-direction: column;
        gap: 14px;
        overflow-y: auto;
        border-left: 1px solid var(--admin-border);
        padding-left: 16px;
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(s);
  }

  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-table-header">
      <h2 class="label">SUPPORT_CENTER</h2>
      <span class="label text-muted" style="font-size:10px;letter-spacing:.12em">CUSTOMER_TRIAGE_NETWORK</span>
    </div>

    <div id="scGrid">

      <!-- LEFT PANEL: TICKET LIST -->
      <div id="scLeftPanel" class="glass">

        <!-- Filter bar (hidden in compact mode) -->
        <div id="scFilterBar">
          <select id="supportStatusFilter" onchange="setAdminSupportFilter(this.value)" style="background:#070810; border:1px solid var(--admin-border); border-radius:6px; color:#fff; padding:6px 12px; width:100%; font-family:'Space Mono'; font-size:10px; outline:none;">
            <option value="OPEN"             ${activeSupportFilterStatus === 'OPEN'             ? 'selected' : ''}>STATUS: OPEN</option>
            <option value="WAITING_SUPPORT"  ${activeSupportFilterStatus === 'WAITING_SUPPORT'  ? 'selected' : ''}>STATUS: WAITING_SUPPORT</option>
            <option value="WAITING_CUSTOMER" ${activeSupportFilterStatus === 'WAITING_CUSTOMER' ? 'selected' : ''}>STATUS: WAITING_CUSTOMER</option>
            <option value="RESOLVED"         ${activeSupportFilterStatus === 'RESOLVED'         ? 'selected' : ''}>STATUS: RESOLVED</option>
            <option value="CLOSED"           ${activeSupportFilterStatus === 'CLOSED'           ? 'selected' : ''}>STATUS: CLOSED</option>
            <option value=""                 ${activeSupportFilterStatus === ''                 ? 'selected' : ''}>STATUS: ALL</option>
          </select>
        </div>

        <!-- Ticket cards / avatar circles -->
        <div id="adminSupportTicketsList">
          <div class="panel-loading" style="font-size:10px;">FETCHING_TICKETS...</div>
        </div>

      </div>

      <!-- RIGHT PANEL: CONVERSATION & DETAILS -->
      <div id="adminSupportDetailsPanel" class="glass"
           style="border:1px solid var(--admin-border); border-radius:20px; background:var(--admin-panel);
                  padding:24px; display:flex; flex-direction:column;
                  justify-content:center; align-items:center; overflow:hidden;">
        <div style="font-size:3rem; margin-bottom:15px; opacity:0.3;">🎧</div>
        <p class="label text-muted" style="font-size:10px; letter-spacing:0.12em;">SELECT_A_TICKET_TO_COMMENCE_TRIAGE</p>
      </div>

    </div>
  `;

  await loadAdminSupportTicketsList();
  if (activeAdminSupportTicketId) {
    loadAdminTicketDetails(activeAdminSupportTicketId);
  }
}

async function setAdminSupportFilter(val) {
  activeSupportFilterStatus = val;
  await loadAdminSupportTicketsList();
}

async function loadAdminSupportTicketsList() {
  const listContainer = document.getElementById('adminSupportTicketsList');
  if (!listContainer) return;

  try {
    const url = activeSupportFilterStatus ? `/admin/support/tickets?status=${activeSupportFilterStatus}` : '/admin/support/tickets';
    const res = await API.get(url);
    const tickets = res.data || [];

    if (tickets.length === 0) {
      listContainer.innerHTML = `<p style="text-align:center; padding:40px 0; font-family:'Space Mono'; font-size:10px; color:#555;">NO_TICKETS_FOUND</p>`;
      return;
    }

    const isCompact = document.getElementById('scGrid')?.classList.contains('sc-compact');

    listContainer.innerHTML = tickets.map(t => {
      const isSelected = t.id === activeAdminSupportTicketId;
      const date = new Date(t.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
      const shortId = t.id.slice(0, 8).toUpperCase();
      const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].content : '';
      const truncatedMsg = lastMsg.length > 55 ? lastMsg.slice(0, 55) + '...' : lastMsg;

      // Priority colours
      const priColor  = t.priority === 'HIGH' ? '#ff4d6d' : t.priority === 'MEDIUM' ? '#ffc107' : '#00c853';
      const priGlow   = t.priority === 'HIGH' ? 'animation:pulse 1.5s infinite;' : '';
      const priBadge  = t.priority === 'HIGH' ? '🔴 HIGH' : t.priority === 'MEDIUM' ? '🟡 MED' : '🟢 LOW';
      const priClass  = t.priority === 'HIGH' ? 'stock-flag-zero' : 'stock-flag-low';

      // ── COMPACT MODE: avatar circles ──
      if (isCompact) {
        const initials = (t.user?.name || 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        // Generate a consistent hue from the user name
        const hue = [...(t.user?.name || 'G')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        const avatarBg = `hsl(${hue},45%,22%)`;
        const activeCls = isSelected ? 'sc-active' : '';
        return `
          <div title="${t.user?.name || 'Guest'} — #${shortId}\n${truncatedMsg}"
               onclick="selectAdminTicket('${t.id}')">
            <div class="sc-avatar-btn ${activeCls}"
                 style="background:${avatarBg}; border-color:${isSelected ? 'var(--c1)' : 'transparent'}; ${priGlow}">
              ${initials}
              <span class="sc-prio-dot" style="background:${priColor};"></span>
            </div>
          </div>`;
      }

      // ── NORMAL MODE: full cards ──
      const activeBg = isSelected
        ? 'background:rgba(0,229,255,0.04); border-color:var(--c1);'
        : 'background:rgba(255,255,255,0.01); border-color:var(--admin-border);';

      return `
        <div onclick="selectAdminTicket('${t.id}')"
             style="padding:15px; border:1px solid; border-radius:12px; cursor:pointer; transition:all 0.2s; ${activeBg}"
             onmouseover="if(!${isSelected}) this.style.borderColor='rgba(0,229,255,0.15)'"
             onmouseout="if(!${isSelected}) this.style.borderColor='var(--admin-border)'">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-family:'Space Mono'; font-size:11px; font-weight:700; color:#fff;">#${shortId}</span>
            <span style="font-family:'Space Mono'; font-size:8px; border-radius:4px; padding:2px 6px; ${priGlow}" class="stock-flag ${priClass}">${priBadge}</span>
          </div>
          <div style="font-size:11.5px; font-weight:600; color:#eee; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.user?.name || 'GUEST'}</div>
          <div style="font-size:11px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:6px;">${truncatedMsg}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-family:'Space Mono'; font-size:8px; color:#444;">
            <span>CAT: ${t.category}</span>
            <span>${date}</span>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    listContainer.innerHTML = `<p style="text-align:center; padding:20px; font-family:'Space Mono'; font-size:10px; color:#ff4d6d;">LOAD_FAILED</p>`;
  }
}

function selectAdminTicket(id) {
  activeAdminSupportTicketId = id;
  // Collapse the ticket list to circle-strip mode
  const grid = document.getElementById('scGrid');
  if (grid) grid.classList.add('sc-compact');
  loadAdminSupportTicketsList();
  loadAdminTicketDetails(id);
}

async function loadAdminTicketDetails(id) {
  const panel = document.getElementById('adminSupportDetailsPanel');
  if (!panel) return;

  panel.style.justifyContent = 'flex-start';
  panel.style.alignItems = 'stretch';
  panel.innerHTML = `<div class="panel-loading" style="font-size:10px;">DECRYPTING_SIGNAL_TRANSMISSION...</div>`;

  try {
    const res = await API.get(`/admin/support/tickets/${id}`);

    const ticket = res.data;
    // Notes are already included in the ticket response from getAdminTicketById
    const notes = ticket.notes || [];
    const shortId = ticket.id.slice(0, 8).toUpperCase();
    
    // Parse AI Summary
    let aiSummaryHtml = '';
    if (ticket.aiSummary) {
      try {
        const sum = JSON.parse(ticket.aiSummary);
        aiSummaryHtml = `
          <div style="background:rgba(0, 229, 255, 0.03); border:1px solid rgba(0, 229, 255, 0.15); border-radius:12px; padding:16px 20px; margin-bottom:16px;">
            <div style="font-family:'Space Mono'; font-size:8px; letter-spacing:0.12em; color:var(--c1); font-weight:700; margin-bottom:10px;">┌─ AI_TRIAGE_SUMMARY ───────────────</div>
            <div style="font-size:12.5px; line-height:1.5; color:#fff; margin-bottom:8px;"><strong style="color:var(--c1)">Summary:</strong> ${sum.shortSummary}</div>
            <div style="font-size:11.5px; color:#ccc; margin-bottom:8px;"><strong style="color:var(--c1)">Highlights:</strong> ${sum.highlights ? sum.highlights.map(h => `· ${h}`).join(' ') : 'None'}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11px; margin-top:8px; border-top:1px dashed rgba(0,229,255,0.1); padding-top:8px;">
              <div><strong style="color:var(--c1)">Cause:</strong> ${sum.suggestedCause || 'N/A'}</div>
              <div><strong style="color:var(--c1)">Action:</strong> ${sum.suggestedAction || 'N/A'}</div>
            </div>
          </div>
        `;
      } catch (e) {
        console.warn('AI summary JSON parse failed:', e);
      }
    }

    // Suggested replies panel loading trigger
    let repliesLoaderHtml = `
      <div id="aiRepliesSection" style="background:rgba(139, 92, 255, 0.03); border:1px dashed rgba(139, 92, 255, 0.25); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'Space Mono'; font-size:9px; letter-spacing:0.1em; color:#8b5cff; font-weight:700;">✦ AI_SUGGESTED_REPLIES</span>
          <button class="btn btn-ghost btn-sm" onclick="fetchSuggestedReplies('${ticket.id}')" style="font-family:'Space Mono'; font-size:8px; padding:2px 8px; border-radius:4px;">GENERATE_DRAFTS</button>
        </div>
        <div id="aiRepliesDrafts" style="margin-top:10px; font-size:11px; color:#555; text-align:center;">Click generate to draft responses with HUVVSM AI.</div>
      </div>
    `;

    // Internal notes HTML
    const notesHtml = notes.map(n => `
      <div style="border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:8px; margin-bottom:8px; font-size:11.5px;">
        <div style="display:flex; justify-content:space-between; font-family:'Space Mono'; font-size:8px; color:#555; margin-bottom:4px;">
          <span>BY: ${n.authorName}</span>
          <span>${new Date(n.createdAt).toLocaleDateString()}</span>
        </div>
        <p style="margin:0; color:#bbb; line-height:1.4;">${n.content}</p>
      </div>
    `).join('') || `<p style="font-family:'Space Mono'; font-size:9px; color:#444; text-align:center; padding:10px 0;">NO_INTERNAL_NOTES</p>`;

    const messagesHtml = ticket.messages.map(m => {
      const isAdmin = m.senderRole === 'ADMIN' || m.senderRole === 'OWNER';
      const roleText = isAdmin ? m.senderName.toUpperCase() : 'CUSTOMER';
      const bg = isAdmin ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #00b0ff, #007bb5)';
      const align = isAdmin ? 'flex-end' : 'flex-start';
      const borderRad = isAdmin ? 'border-bottom-right-radius: 2px; border:1px solid rgba(255,255,255,0.05);' : 'border-bottom-left-radius: 2px;';

      return `
        <div style="align-self:${align}; max-width:80%; display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
          <div style="font-family:'Space Mono'; font-size:8px; color:#555; text-align:${isAdmin ? 'right' : 'left'}">${roleText} · ${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
          <div style="background:${bg}; color:#fff; padding:12px 16px; border-radius:12px; ${borderRad} font-size:12.5px; line-height:1.5;">
            ${m.content}
          </div>
        </div>`;
    }).join('');

    // Satisfaction score display if resolved/closed and rated
    let ratingDisplayHtml = '';
    if (ticket.rating) {
      ratingDisplayHtml = `
        <div style="background:rgba(0,255,127,0.03); border:1px solid rgba(0,255,127,0.15); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-family:'Space Mono'; font-size:8px; color:#00ff7f; letter-spacing:0.1em;">CUSTOMER_SATISFACTION</div>
            <div style="font-size:12px; color:#fff; font-weight:600; margin-top:2px;">"${ticket.ratingNote || 'No comment submitted'}"</div>
          </div>
          <div style="font-size:1.5rem; color:#ffc107; font-weight:700;">${'★'.repeat(ticket.rating)}${'☆'.repeat(5 - ticket.rating)}</div>
        </div>
      `;
    }

    // Switch panel from centered placeholder to full-detail mode
    panel.style.justifyContent = 'flex-start';
    panel.style.alignItems    = 'stretch';
    panel.style.overflow      = 'hidden';
    panel.style.padding       = '20px';

    panel.innerHTML = `
      <div id="scTicketDetail">

        <!-- ── Header ── -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start;
                    border-bottom:1px solid var(--admin-border); padding-bottom:12px; margin-bottom:14px; flex-shrink:0;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="font-family:'Space Mono'; font-size:13px; font-weight:700; color:#fff; margin:0;">TICKET #${shortId}</h3>
              <span style="font-family:'Space Mono'; font-size:8px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; color:#888;">${ticket.category}</span>
            </div>
            <div style="font-size:11px; font-weight:600; color:var(--c1); margin-top:3px;">${ticket.user?.name} (${ticket.user?.email})</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <select onchange="updateAdminTicketStatus('${ticket.id}', this.value)"
                    style="background:#070810; border:1px solid var(--admin-border); border-radius:6px; color:#fff;
                           padding:5px 10px; font-family:'Space Mono'; font-size:9px; outline:none; height:28px;">
              <option value="OPEN"             ${ticket.status === 'OPEN'             ? 'selected' : ''}>OPEN</option>
              <option value="WAITING_SUPPORT"  ${ticket.status === 'WAITING_SUPPORT'  ? 'selected' : ''}>WAITING_SUPPORT</option>
              <option value="WAITING_CUSTOMER" ${ticket.status === 'WAITING_CUSTOMER' ? 'selected' : ''}>WAITING_CUSTOMER</option>
              <option value="RESOLVED"         ${ticket.status === 'RESOLVED'         ? 'selected' : ''}>RESOLVED</option>
              <option value="CLOSED"           ${ticket.status === 'CLOSED'           ? 'selected' : ''}>CLOSED</option>
            </select>
            <button class="btn btn-ghost btn-sm" onclick="closeAdminTicketTriage('${ticket.id}')"
                    style="height:28px; font-family:'Space Mono'; font-size:9px;">RESOLVE</button>
          </div>
        </div>

        <!-- ── Two-column body ── -->
        <div id="scConvoWrap">
        
          <!-- Left chat column -->
          <div id="scChatCol">
          
          <!-- Message thread -->
          <div style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.15); border:1px solid var(--admin-border); border-radius:12px; margin-bottom:14px;" id="adminTicketChatThread">
            ${messagesHtml}
          </div>
          
          <!-- Suggested replies -->
          ${repliesLoaderHtml}

          <!-- ── Reply box ── -->
          <div style="display:flex; gap:10px; flex-shrink:0; padding-top:8px;">
            <textarea id="adminTicketReplyText" class="input"
                      placeholder="Type response here…"
                      style="flex:1; background:rgba(255,255,255,0.02); height:52px; resize:none;
                             outline:none; font-size:12.5px; padding:10px 14px;"
                      onkeydown="handleAdminReplyKeydown(event, '${ticket.id}')"></textarea>
            <button class="btn btn-primary" onclick="submitAdminReply('${ticket.id}')"
                    style="padding:10px 20px; font-family:'Space Mono'; font-size:10px; white-space:nowrap;">✦ REPLY</button>
          </div>

          </div><!-- /scChatCol -->

          <!-- Right metadata / notes column -->
          <div id="scMetaCol">
          
          <!-- CSAT rating if populated -->
          ${ratingDisplayHtml}

          <!-- AI Summary -->
          ${aiSummaryHtml}

          <!-- Staff Notes -->
          <div style="background:rgba(255,255,255,0.015); border:1px solid var(--admin-border); border-radius:12px; padding:16px;">
            <div style="font-family:'Space Mono'; font-size:8px; letter-spacing:0.1em; color:#888; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.04); padding-bottom:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
              <span>🔒 INTERNAL_NOTES</span>
              <span style="color:#555">STAFF_ONLY</span>
            </div>
            
            <div style="max-height:160px; overflow-y:auto; margin-bottom:10px; padding-right:4px;">
              ${notesHtml}
            </div>

            <div style="display:flex; flex-direction:column; gap:8px; border-top:1px dashed rgba(255,255,255,0.05); padding-top:10px;">
              <textarea id="newStaffNoteText" placeholder="Add staff memo..." style="background:rgba(0,0,0,0.2); border:1px solid var(--admin-border); border-radius:6px; font-size:11px; padding:6px 10px; color:#fff; outline:none; min-height:40px; resize:none; font-family:var(--font-body);"></textarea>
              <button class="btn btn-ghost btn-sm" onclick="submitStaffNote('${ticket.id}')" style="font-family:'Space Mono'; font-size:8px; align-self:flex-end;">SAVE</button>
            </div>
          </div>

          </div><!-- /scMetaCol -->

        </div><!-- /scConvoWrap -->

      </div><!-- /scTicketDetail -->
    `;

    setTimeout(() => {
      const thread = document.getElementById('adminTicketChatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }, 100);

  } catch (err) {
    console.error('[TICKET DETAIL ERROR]', err.message);
    panel.innerHTML = `
      <div style="padding:40px; text-align:center;">
        <div style="font-family:'Space Mono'; font-size:9px; letter-spacing:0.1em; color:#ff4d6d; margin-bottom:12px;">⚠ SIGNAL_LOAD_FAILED</div>
        <div style="font-size:12px; color:#666; max-width:360px; margin:0 auto; line-height:1.6;">${err.message}</div>
      </div>`;
  }
}

async function fetchSuggestedReplies(ticketId) {
  const draftsBox = document.getElementById('aiRepliesDrafts');
  if (!draftsBox) return;

  draftsBox.innerHTML = `<span class="spinner" style="border-color:#8b5cff; border-top-color:transparent;"></span> Drafting replies...`;

  try {
    const res = await API.post(`/admin/support/tickets/${ticketId}/suggest-replies`);
    const suggestions = res.data.suggestions || [];
    currentSuggestions = suggestions;

    draftsBox.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left; margin-top:8px;">
        ${suggestions.map((s, idx) => `
          <div style="background:rgba(139, 92, 255, 0.05); border:1px solid rgba(139, 92, 255, 0.15); border-radius:8px; padding:10px; font-size:11.5px; line-height:1.4;">
            <div style="font-weight:700; color:#8b5cff; margin-bottom:4px; font-size:10px; font-family:'Space Mono';">${s.label}</div>
            <div style="color:#ddd; margin-bottom:6px; font-size:11px;">"${s.content.slice(0, 75)}..."</div>
            <div style="display:flex; justify-content:flex-end; gap:6px;">
              <button class="btn btn-ghost btn-sm" onclick="useSuggestedReply(${idx}, false)" style="font-family:'Space Mono'; font-size:8px; padding:2px 8px;">USE</button>
              <button class="btn btn-ghost btn-sm" onclick="useSuggestedReply(${idx}, true)" style="font-family:'Space Mono'; font-size:8px; padding:2px 8px;">EDIT & USE</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    draftsBox.innerHTML = `<span style="color:#ff4d6d;">Drafting failed: ${err.message}</span>`;
  }
}

function useSuggestedReply(idx, startEditing) {
  const s = currentSuggestions[idx];
  if (!s) return;

  const replyArea = document.getElementById('adminTicketReplyText');
  if (replyArea) {
    const detailsPanel = document.getElementById('adminSupportDetailsPanel');
    const nameText = detailsPanel.querySelector('h3').nextElementSibling.textContent;
    const customer = nameText.split(' (')[0];
    let filledText = s.content.replace(/\[Customer Name\]/g, customer).replace(/\[Your Name\]/g, Auth.getUser().name);
    
    replyArea.value = filledText;
    if (startEditing) {
      replyArea.focus();
      replyArea.setSelectionRange(0, 0);
    }
  }
}

async function updateAdminTicketStatus(ticketId, status) {
  try {
    await API.patch(`/admin/support/tickets/${ticketId}/status`, { status });
    Toast.success('STATUS_UPDATED');
    loadAdminSupportTicketsList();
  } catch (err) {
    Toast.error('Failed to update status.');
  }
}

async function closeAdminTicketTriage(ticketId) {
  if (!confirm('Mark this support signal as resolved? This triggers a satisfaction review request.')) return;
  try {
    await API.patch(`/admin/support/tickets/${ticketId}/status`, { status: 'RESOLVED' });
    Toast.success('SIGNAL_CLOSED_AND_RESOLVED');
    loadAdminSupportTicketsList();
    loadAdminTicketDetails(ticketId);
    checkAdminUnreadSupport();
  } catch (err) {
    Toast.error('Action failed.');
  }
}

async function submitAdminReply(ticketId) {
  const replyArea = document.getElementById('adminTicketReplyText');
  const content = replyArea.value.trim();
  if (!content) return;

  replyArea.value = '';

  try {
    const res = await API.post(`/admin/support/tickets/${ticketId}/reply`, {
      content,
      status: 'WAITING_CUSTOMER'
    });
    if (res.success) {
      loadAdminTicketDetails(ticketId);
      loadAdminSupportTicketsList();
    }
  } catch (err) {
    Toast.error('Reply failed to transmit.');
  }
}

function handleAdminReplyKeydown(e, ticketId) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitAdminReply(ticketId);
  }
}

async function submitStaffNote(ticketId) {
  const noteArea = document.getElementById('newStaffNoteText');
  const content = noteArea.value.trim();
  if (!content) return;

  noteArea.value = '';

  try {
    await API.post(`/admin/support/tickets/${ticketId}/notes`, { content });
    Toast.success('MEMO_SAVED_SECURELY');
    loadAdminTicketDetails(ticketId);
  } catch (err) {
    Toast.error('Failed to save staff memo.');
  }
}

/* ============================================================ */
/* HUVVSM V2 — ADMIN AI ASSISTANT PANEL                         */
/* ============================================================ */

let adminAiHistory = [];

const adminAiSuggestions = {
  dashboard: [
    "What happened today?",
    "Show weekly business summary",
    "Compare this month's revenue to last month",
    "List top performance KPIs"
  ],
  products: [
    "List out-of-stock products",
    "Which items have low stock?",
    "List best selling specimens",
    "Check catalog count"
  ],
  orders: [
    "How many orders are pending processing?",
    "What is today's order yield?",
    "Are there any order delivery issues?",
    "Check average transaction value"
  ],
  management: [
    "Support queue check",
    "Loyalty reward distribution stats",
    "Average CSAT rating",
    "How many customer tickets are open?"
  ]
};

function renderAdminAI() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-table-header">
      <h2 class="label">MANAGEMENT_AI_ASSISTANT</h2>
      <span class="label text-muted" style="font-size:10px;letter-spacing:.12em">HUVVSM_CORE_INTELLIGENCE</span>
    </div>
    
    <div style="display:grid; grid-template-columns: 240px 1fr; gap: 20px; height: calc(100vh - 160px); margin-top:15px; min-height:600px;">
      
      <!-- LEFT COLUMN: PROMPT TILES -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="glass" onclick="selectAdminAiCategory('dashboard')" id="ai-cat-dashboard" style="padding:16px; border:1px solid var(--admin-border); border-radius:12px; cursor:pointer; text-align:center; background:rgba(255,255,255,0.015); transition:all 0.2s;">
          <div style="font-size:1.3rem; margin-bottom:4px;">📊</div>
          <div style="font-family:'Space Mono'; font-size:9.5px; font-weight:700; color:#fff;">DASHBOARD_ANALYTICS</div>
        </div>
        <div class="glass" onclick="selectAdminAiCategory('products')" id="ai-cat-products" style="padding:16px; border:1px solid var(--admin-border); border-radius:12px; cursor:pointer; text-align:center; background:rgba(255,255,255,0.015); transition:all 0.2s;">
          <div style="font-size:1.3rem; margin-bottom:4px;">📦</div>
          <div style="font-family:'Space Mono'; font-size:9.5px; font-weight:700; color:#fff;">INVENTORY_CONTROL</div>
        </div>
        <div class="glass" onclick="selectAdminAiCategory('orders')" id="ai-cat-orders" style="padding:16px; border:1px solid var(--admin-border); border-radius:12px; cursor:pointer; text-align:center; background:rgba(255,255,255,0.015); transition:all 0.2s;">
          <div style="font-size:1.3rem; margin-bottom:4px;">🛒</div>
          <div style="font-family:'Space Mono'; font-size:9.5px; font-weight:700; color:#fff;">ORDER_STREAMS</div>
        </div>
        <div class="glass" onclick="selectAdminAiCategory('management')" id="ai-cat-management" style="padding:16px; border:1px solid var(--admin-border); border-radius:12px; cursor:pointer; text-align:center; background:rgba(255,255,255,0.015); transition:all 0.2s;">
          <div style="font-size:1.3rem; margin-bottom:4px;">⚙</div>
          <div style="font-family:'Space Mono'; font-size:9.5px; font-weight:700; color:#fff;">PLATFORM_MGMT</div>
        </div>
      </div>

      <!-- RIGHT COLUMN: CHAT INTERACTION -->
      <div class="glass" style="display:flex; flex-direction:column; border:1px solid var(--admin-border); border-radius:20px; background:var(--admin-panel); padding:24px; overflow:hidden; justify-content:space-between;">
        
        <!-- Chat output messages -->
        <div id="adminAiChatMessages" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; background:rgba(0,0,0,0.15); border:1px solid var(--admin-border); border-radius:12px; margin-bottom:14px;">
          <div style="align-self:flex-start; max-width:80%; display:flex; flex-direction:column; gap:4px;">
            <div style="font-family:'Space Mono'; font-size:8px; color:#555;">HUVVSM MANAGEMENT AI</div>
            <div style="background:rgba(255,255,255,0.03); color:#fff; padding:12px 16px; border-radius:12px; border-bottom-left-radius:2px; font-size:12.5px; line-height:1.5; border:1px solid rgba(255,255,255,0.05)">
              Greetings authorized administrator. I have mapped the HUVVSM database schema. Specify metrics or choose from recommendations on the left.
            </div>
          </div>
          <!-- Typing indicator -->
          <div id="adminAiTypingIndicator" class="typing-indicator" style="display:none; align-self:flex-start; padding:12px; border-radius:12px; border:1px solid var(--admin-border); background:rgba(0,0,0,0.2);">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>

        <!-- Suggestion Chips Row -->
        <div id="adminAiChipsRow" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; min-height:30px;">
          <!-- dynamically rendered suggestions -->
        </div>

        <!-- Input box -->
        <div style="display:flex; gap:12px;">
          <input type="text" id="adminAiChatInput" class="input" placeholder="Query management database via AI..." style="flex:1; background:rgba(255,255,255,0.02); height:45px; outline:none; font-size:13px; padding:0 16px;" onkeydown="handleAdminAiKeydown(event)">
          <button class="btn btn-primary" onclick="submitAdminAiMessage()" style="padding:0 24px; font-family:'Space Mono'; font-size:11px; height:45px;">✦ QUERY</button>
        </div>

      </div>

    </div>
  `;

  selectAdminAiCategory('dashboard');
}

function selectAdminAiCategory(cat) {
  document.querySelectorAll('[id^="ai-cat-"]').forEach(el => {
    el.style.borderColor = 'var(--admin-border)';
    el.style.background = 'rgba(255,255,255,0.015)';
  });

  const activeCard = document.getElementById(`ai-cat-${cat}`);
  if (activeCard) {
    activeCard.style.borderColor = 'var(--c1)';
    activeCard.style.background = 'rgba(0, 229, 255, 0.05)';
  }

  const chipsRow = document.getElementById('adminAiChipsRow');
  if (chipsRow) {
    chipsRow.innerHTML = '';
    const suggestions = adminAiSuggestions[cat] || [];
    suggestions.forEach(text => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = text;
      chip.style.margin = '0';
      chip.onclick = () => submitAdminAiMessage(text);
      chipsRow.appendChild(chip);
    });
  }
}

async function submitAdminAiMessage(presetText = null) {
  const input = document.getElementById('adminAiChatInput');
  const msgText = presetText || input.value.trim();
  if (!msgText) return;

  if (!presetText) {
    input.value = '';
  }

  appendAdminAiMessage(msgText, 'user', 'ADMINISTRATOR');

  const indicator = document.getElementById('adminAiTypingIndicator');
  if (indicator) indicator.style.display = 'flex';
  scrollAdminAiChat();

  try {
    const response = await fetch(`${API.BASE}/admin/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ message: msgText, history: adminAiHistory })
    });
    const json = await response.json();
    if (indicator) indicator.style.display = 'none';

    if (json.success && json.data) {
      const aiResponse = json.data.response;
      appendAdminAiMessage(aiResponse, 'model', 'HUVVSM MANAGEMENT AI');
      
      adminAiHistory.push({ role: 'user', message: msgText });
      adminAiHistory.push({ role: 'model', message: aiResponse });
      if (adminAiHistory.length > 20) adminAiHistory.shift();
    } else {
      appendAdminAiMessage(json.error || 'Connection lost. Decryption failure.', 'model', 'HUVVSM MANAGEMENT AI');
    }
  } catch (err) {
    if (indicator) indicator.style.display = 'none';
    appendAdminAiMessage('Query failed to transmit to AI. Check console logs.', 'model', 'HUVVSM MANAGEMENT AI');
  }

  scrollAdminAiChat();
}

function handleAdminAiKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitAdminAiMessage();
  }
}

function appendAdminAiMessage(text, sender, senderName) {
  const messagesDiv = document.getElementById('adminAiChatMessages');
  if (!messagesDiv) return;

  const wrapper = document.createElement('div');
  const align = sender === 'user' ? 'flex-end' : 'flex-start';
  wrapper.style.alignSelf = align;
  wrapper.style.maxWidth = '80%';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '4px';

  const roleEl = document.createElement('div');
  roleEl.style.fontFamily = "'Space Mono', monospace";
  roleEl.style.fontSize = '8px';
  roleEl.style.color = '#555';
  roleEl.style.textAlign = sender === 'user' ? 'right' : 'left';
  roleEl.textContent = senderName;

  const bubble = document.createElement('div');
  const bg = sender === 'user' ? 'linear-gradient(135deg, #8b5cff, #6d46cc)' : 'rgba(255,255,255,0.03)';
  const borderRad = sender === 'user' ? 'border-bottom-right-radius: 2px;' : 'border-bottom-left-radius: 2px; border: 1px solid rgba(255,255,255,0.05);';
  
  bubble.style.background = bg;
  bubble.style.color = '#fff';
  bubble.style.padding = '12px 16px';
  bubble.style.borderRadius = '12px';
  bubble.style.cssText += borderRad;
  bubble.style.fontSize = '12.5px';
  bubble.style.lineHeight = '1.5';
  if (sender === 'model' && typeof window.marked !== 'undefined') {
    bubble.style.whiteSpace = 'normal';
    try {
      bubble.innerHTML = window.marked.parse(text);
      
      // Clean up markdown table styles for futuristic HUVVSM UI
      bubble.querySelectorAll('table').forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '12px 0';
        table.style.fontSize = '11px';
        table.style.fontFamily = "'Space Mono', monospace";
        
        table.querySelectorAll('th, td').forEach(cell => {
          cell.style.border = '1px solid rgba(255,255,255,0.08)';
          cell.style.padding = '8px';
          cell.style.textAlign = 'left';
        });
        table.querySelectorAll('th').forEach(th => {
          th.style.background = 'rgba(255,255,255,0.03)';
          th.style.color = '#8a8a93';
        });
      });
      
      // Bullet items style check
      bubble.querySelectorAll('ul, ol').forEach(list => {
        list.style.paddingLeft = '20px';
        list.style.margin = '8px 0';
      });
      bubble.querySelectorAll('li').forEach(li => {
        li.style.marginBottom = '4px';
      });
    } catch (err) {
      console.warn('Marked parsing failed, falling back to simple format:', err);
      bubble.innerHTML = formatMessage(text);
    }
  } else {
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.innerHTML = formatMessage(text);
  }

  wrapper.appendChild(roleEl);
  wrapper.appendChild(bubble);

  // Insert before the typing indicator
  const indicator = document.getElementById('adminAiTypingIndicator');
  messagesDiv.insertBefore(wrapper, indicator);
  scrollAdminAiChat();
}

function scrollAdminAiChat() {
  const messagesDiv = document.getElementById('adminAiChatMessages');
  if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminDashboard);
else initAdminDashboard();