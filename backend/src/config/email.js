/* ============================================================ */
/* HUVVSM — EMAIL SERVICE                                       */
/* src/config/email.js                                         */
/* ============================================================ */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ============================================================ */
/* SHARED LAYOUT HELPER                                         */
/* All templates are wrapped in this for brand consistency.     */
/* ============================================================ */

function emailLayout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HUVVSM</title>
</head>
<body style="margin:0;padding:0;background:#03040b;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px">

    <!-- HEADER -->
    <div style="text-align:center;padding:36px 0 28px;border-bottom:1px solid #1a1d2e">
      <div style="font-family:monospace;font-size:30px;font-weight:900;letter-spacing:0.12em;
                  background:linear-gradient(90deg,#00e5ff,#8b5cff);
                  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                  background-clip:text">
        HUVVSM
      </div>
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.35em;color:#334155;margin-top:6px">
        SIGNAL SYSTEM V4.8
      </div>
    </div>

    <!-- BODY CONTENT -->
    ${content}

    <!-- FOOTER -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid #1a1d2e;margin-top:8px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#1e293b;margin-bottom:6px">
        HUVVSM — ENGINEERING DIGITAL IDENTITY
      </div>
      <div style="font-family:monospace;font-size:8px;letter-spacing:0.15em;color:#1e293b">
        © 2026 HUVVSM — ALL RIGHTS RESERVED
      </div>
    </div>

  </div>
</body>
</html>`;
}

/* ── REUSABLE UI BLOCKS ── */

function ctaButton(text, href, color = '#00e5ff') {
  return `
    <div style="text-align:center;margin-top:8px">
      <a href="${href}"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,${color === '#00e5ff' ? '#00e5ff,#0ab3cc' : '#8b5cff,#6d46cc'});
                border-radius:8px;font-family:monospace;font-size:12px;
                font-weight:700;letter-spacing:0.18em;color:#03040b;
                text-decoration:none">
        ${text}
      </a>
    </div>`;
}

function infoBox(label, value, accent = '#00e5ff') {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:12px 16px;border-bottom:1px solid #1a1d2e">
      <span style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#475569">${label}</span>
      <span style="font-family:monospace;font-size:11px;font-weight:700;color:${accent}">${value}</span>
    </div>`;
}

/* ============================================================ */
/* 1. WELCOME EMAIL                                             */
/* Triggered: immediately after successful registration         */
/* ============================================================ */

export const sendWelcomeEmail = async (user) => {
  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:44px 0 32px">
      <div style="display:inline-block;width:68px;height:68px;border-radius:16px;
                  background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);
                  line-height:68px;font-size:28px;margin-bottom:24px">
        ✦
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
        // IDENTITY_ESTABLISHED
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        Welcome to HUVVSM
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:14px;line-height:1.7;max-width:420px;margin-left:auto;margin-right:auto">
        Your identity has been confirmed, ${user.name}.<br>
        You now have access to the full HUVVSM signal network.
      </p>
    </div>

    <!-- REWARDS INTRO CARD -->
    <div style="background:linear-gradient(135deg,rgba(139,92,255,0.08),rgba(0,229,255,0.04));
                border:1px solid rgba(139,92,255,0.25);border-radius:14px;
                padding:28px;margin-bottom:28px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.3em;color:#8b5cff;margin-bottom:14px">
        ✦ HUVVSM_REWARDS_SYSTEM
      </div>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#f1f5f9">
        Earn points with every order.
      </h2>
      <p style="color:#94a3b8;font-size:13px;line-height:1.75;margin:0 0 20px">
        Every time an order is delivered, you earn loyalty points automatically.<br>
        Accumulate enough points and unlock exclusive discount coupons — redeemable at checkout.
      </p>
      <div style="display:flex;gap:0;border:1px solid #1a1d2e;border-radius:10px;overflow:hidden">
        <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #1a1d2e">
          <div style="font-family:monospace;font-size:20px;font-weight:900;color:#00e5ff">10 DH</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;margin-top:4px">= 1 POINT</div>
        </div>
        <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #1a1d2e">
          <div style="font-family:monospace;font-size:20px;font-weight:900;color:#8b5cff">100 PTS</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;margin-top:4px">= COUPON</div>
        </div>
        <div style="flex:1;padding:16px;text-align:center">
          <div style="font-family:monospace;font-size:20px;font-weight:900;color:#00ff7f">AUTO</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;margin-top:4px">GENERATED</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    ${ctaButton('BROWSE_CATALOGUE →', `${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/shop.html`)}

    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;
               letter-spacing:0.1em;margin-top:28px">
      Questions? Reach us at
      <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#00e5ff;text-decoration:none">
        ${process.env.SUPPORT_EMAIL}
      </a>
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `✦ Welcome to HUVVSM — Your identity is confirmed`,
    html
  });

  console.log(`[EMAIL] Welcome email sent to ${user.email}`);
};

/* ============================================================ */
/* 2. ORDER CONFIRMATION EMAIL (upgraded)                       */
/* Triggered: immediately after checkout                        */
/* ============================================================ */

export const sendOrderConfirmation = async (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #1a1d2e;font-size:13px;color:#e2e8f0">
        ${item.product?.name || 'SPECIMEN'}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #1a1d2e;font-size:13px;color:#94a3b8;text-align:center">
        ${item.size}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #1a1d2e;font-size:13px;color:#94a3b8;text-align:center">
        ×${item.quantity}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #1a1d2e;font-size:13px;color:#00e5ff;text-align:right;font-weight:700">
        ${(item.price * item.quantity).toLocaleString('fr-MA')} DH
      </td>
    </tr>
  `).join('');

  const shortId = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const discountRow = order.discount && order.discount > 0 ? `
    ${infoBox('LOYALTY_DISCOUNT', `-${order.discount.toLocaleString('fr-MA')} DH`, '#ff4d6d')}
  ` : '';

  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:40px 0 32px">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;
                  background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);
                  line-height:64px;font-size:28px;margin-bottom:24px">
        ✦
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
        // SIGNAL_TRANSMITTED
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        ORDER CONFIRMED
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:12px;line-height:1.6">
        Your signal has been received, ${user.name}.<br>
        We'll process your order and keep you updated.
      </p>
    </div>

    <!-- ORDER ID BOX -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:20px;margin-bottom:24px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:6px">
        ORDER_ID
      </div>
      <div style="font-family:monospace;font-size:22px;font-weight:700;color:#8b5cff;letter-spacing:0.1em">
        #${shortId}
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#475569;margin-top:6px">
        ${date}
      </div>
    </div>

    <!-- ITEMS TABLE -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <div style="padding:14px 20px;border-bottom:1px solid #1a1d2e">
        <span style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#00e5ff">ORDER_MANIFEST</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#070810">
            <th style="padding:10px 8px;font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;text-align:left;font-weight:400">SPECIMEN</th>
            <th style="padding:10px 8px;font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;text-align:center;font-weight:400">SIZE</th>
            <th style="padding:10px 8px;font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;text-align:center;font-weight:400">QTY</th>
            <th style="padding:10px 8px;font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#475569;text-align:right;font-weight:400">PRICE</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="padding:14px 20px;border-top:1px solid #1a1d2e;text-align:right">
        <span style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#475569;margin-right:16px">TOTAL_SIGNAL</span>
        <span style="font-family:monospace;font-size:18px;font-weight:700;color:#00e5ff">
          ${order.total.toLocaleString('fr-MA')} DH
        </span>
      </div>
    </div>

    <!-- ORDER DETAILS -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <div style="padding:14px 20px;border-bottom:1px solid #1a1d2e">
        <span style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#8b5cff">ORDER_PARAMETERS</span>
      </div>
      ${infoBox('DELIVERY_ADDRESS', order.address || '—')}
      ${infoBox('GEOGRAPHIC_CITY', order.city || '—')}
      ${infoBox('PAYMENT_METHOD', (order.paymentMethod || 'on_delivery').toUpperCase().replace('_', ' '))}
      ${discountRow}
      ${infoBox('ESTIMATED_DELIVERY', '3–7 BUSINESS DAYS', '#00ff7f')}
    </div>

    <!-- REWARDS HINT -->
    <div style="background:rgba(139,92,255,0.06);border:1px solid rgba(139,92,255,0.2);
                border-radius:12px;padding:20px;margin-bottom:28px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#8b5cff;margin-bottom:8px">
        ✦ HUVVSM_REWARDS
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.65;margin:0">
        Points will be credited to your account once your order is marked as <strong style="color:#00ff7f">DELIVERED</strong>.
      </p>
    </div>

    <!-- SUPPORT -->
    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;letter-spacing:0.1em">
      Questions about your order?
      <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#00e5ff;text-decoration:none">
        ${process.env.SUPPORT_EMAIL}
      </a>
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `✦ ORDER CONFIRMED #${shortId} — HUVVSM`,
    html
  });

  console.log(`[EMAIL] Order confirmation sent to ${user.email}`);
};

/* ============================================================ */
/* 2b. ORDER PENDING EMAIL                                      */
/* Triggered: immediately after checkout (status = PENDING)    */
/* Customer is told order is placed, awaiting team confirmation */
/* ============================================================ */

export const sendOrderPending = async (order, user) => {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:44px 0 32px">
      <div style="display:inline-block;width:68px;height:68px;border-radius:16px;
                  background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.3);
                  line-height:68px;font-size:28px;margin-bottom:24px">
        ⏳
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#ffc107;margin-bottom:12px">
        // SIGNAL_RECEIVED — AWAITING_CONFIRMATION
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        ORDER PENDING
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:12px;line-height:1.7;max-width:420px;margin-left:auto;margin-right:auto">
        Thank you, ${user.name}.<br>
        Your order has been received and is now <strong style="color:#ffc107">pending confirmation</strong>.<br>
        Our team will review and confirm it shortly.
      </p>
    </div>

    <!-- ORDER ID BOX -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:20px;margin-bottom:24px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:6px">
        ORDER_ID
      </div>
      <div style="font-family:monospace;font-size:22px;font-weight:700;color:#ffc107;letter-spacing:0.1em">
        #${shortId}
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#475569;margin-top:6px">
        ${date}
      </div>
    </div>

    <!-- STATUS STEPS -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:24px;margin-bottom:24px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:18px;text-align:center">
        ORDER_JOURNEY
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;position:relative">
        <!-- step line -->
        <div style="position:absolute;top:14px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,#ffc107 25%,#1a1d2e 25%)"></div>
        <!-- steps -->
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#ffc107;margin:0 auto 8px;line-height:28px;font-size:13px">✦</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#ffc107">PENDING</div>
        </div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#1a1d2e;margin:0 auto 8px;line-height:28px;font-size:13px;color:#475569">○</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#475569">CONFIRMED</div>
        </div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#1a1d2e;margin:0 auto 8px;line-height:28px;font-size:13px;color:#475569">○</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#475569">SHIPPED</div>
        </div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#1a1d2e;margin:0 auto 8px;line-height:28px;font-size:13px;color:#475569">○</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#475569">DELIVERED</div>
        </div>
      </div>
    </div>

    <!-- TOTAL -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;padding:18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#475569">ORDER_TOTAL</span>
      <span style="font-family:monospace;font-size:20px;font-weight:700;color:#00e5ff">${order.total.toLocaleString('fr-MA')} DH</span>
    </div>

    <!-- MESSAGE -->
    <div style="background:rgba(255,193,7,0.05);border:1px solid rgba(255,193,7,0.2);
                border-radius:12px;padding:20px;margin-bottom:28px;text-align:center">
      <p style="color:#94a3b8;font-size:13px;line-height:1.75;margin:0">
        You will receive another email once our team <strong style="color:#ffc107">confirms</strong> your order.<br>
        If you have any questions, don't hesitate to contact us.
      </p>
    </div>

    <!-- CTA -->
    ${ctaButton('VIEW MY ORDERS →', `${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/auth.html`)}

    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;
               letter-spacing:0.1em;margin-top:28px">
      Questions?
      <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#00e5ff;text-decoration:none">
        ${process.env.SUPPORT_EMAIL}
      </a>
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `⏳ Order #${shortId} received — Awaiting confirmation — HUVVSM`,
    html
  });

  console.log(`[EMAIL] Order pending email sent to ${user.email}`);
};

/* ============================================================ */
/* 3b. ORDER SHIPPED EMAIL                                      */
/* Triggered: when admin marks order status → SHIPPED          */
/* ============================================================ */

export const sendOrderShipped = async (order, user) => {
  const shortId = order.id.slice(0, 8).toUpperCase();

  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:44px 0 32px">
      <div style="display:inline-block;width:68px;height:68px;border-radius:50%;
                  background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.3);
                  line-height:68px;font-size:30px;margin-bottom:24px">
        🚚
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
        // PACKAGE_IN_TRANSIT
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        ORDER SHIPPED
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:12px;line-height:1.65">
        Your order is on its way, ${user.name}.<br>
        Sit tight — it'll arrive in <strong style="color:#00e5ff">3–7 business days</strong>.
      </p>
    </div>

    <!-- ORDER REFERENCE -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:18px;margin-bottom:24px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:4px">
        ORDER_REF
      </div>
      <div style="font-family:monospace;font-size:20px;font-weight:700;color:#8b5cff;letter-spacing:0.08em">
        #${shortId}
      </div>
    </div>

    <!-- STATUS STEPS -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:24px;margin-bottom:24px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:18px;text-align:center">
        ORDER_JOURNEY
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;position:relative">
        <div style="position:absolute;top:14px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,#00e5ff 75%,#1a1d2e 75%)"></div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#00e5ff;margin:0 auto 8px;line-height:28px;font-size:13px;color:#03040b">✓</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#00e5ff">CONFIRMED</div>
        </div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#00e5ff;margin:0 auto 8px;line-height:28px;font-size:13px;color:#03040b">✓</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#00e5ff">SHIPPED</div>
        </div>
        <div style="text-align:center;flex:1;position:relative">
          <div style="width:28px;height:28px;border-radius:50%;background:#1a1d2e;margin:0 auto 8px;line-height:28px;font-size:13px;color:#475569">○</div>
          <div style="font-family:monospace;font-size:8px;letter-spacing:0.1em;color:#475569">DELIVERED</div>
        </div>
      </div>
    </div>

    <!-- DELIVERY INFO BOX -->
    <div style="background:rgba(0,229,255,0.05);border:1px solid rgba(0,229,255,0.2);
                border-radius:12px;padding:20px;margin-bottom:28px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#00e5ff;margin-bottom:8px">
        ✦ ESTIMATED_DELIVERY
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0">
        Your package is now on its way. Delivery usually takes <strong style="color:#00ff7f">3–7 business days</strong>.<br>
        You'll receive another email once it arrives.
      </p>
    </div>

    <!-- CTA -->
    ${ctaButton('TRACK MY ORDER →', `${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/auth.html`)}

    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;
               letter-spacing:0.1em;margin-top:28px">
      Need help?
      <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#00e5ff;text-decoration:none">
        ${process.env.SUPPORT_EMAIL}
      </a>
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🚚 Your order #${shortId} has been shipped — HUVVSM`,
    html
  });

  console.log(`[EMAIL] Shipped notification sent to ${user.email}`);
};

/* ============================================================ */
/* 3. ORDER DELIVERED EMAIL                                     */
/* Triggered: when admin marks order status → DELIVERED         */
/* ============================================================ */

export const sendOrderDelivered = async (order, user, pointsEarned, newCoupons = []) => {
  const shortId = order.id.slice(0, 8).toUpperCase();

  const couponSection = newCoupons.length > 0 ? `
    <!-- COUPON CARDS -->
    <div style="margin-top:24px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#8b5cff;
                  margin-bottom:16px;text-align:center">
        ✦ NEW_REWARD_COUPON_GENERATED
      </div>
      ${newCoupons.map(c => `
        <div style="background:linear-gradient(135deg,rgba(0,229,255,0.05),rgba(139,92,255,0.02));
                    border:1px dashed rgba(0,229,255,0.3);border-radius:12px;
                    padding:20px 24px;margin-bottom:12px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="vertical-align:middle">
                <div style="font-family:monospace;font-weight:700;color:#00e5ff;font-size:16px;letter-spacing:0.06em">
                  ${c.code}
                </div>
                <div style="font-family:monospace;font-size:9px;color:#475569;margin-top:4px;letter-spacing:0.05em">
                  EXP: ${new Date(c.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </td>
              <td style="text-align:right;vertical-align:middle">
                <div style="font-family:monospace;font-size:28px;font-weight:900;color:#8b5cff;line-height:1">
                  ${c.discountPercent}% OFF
                </div>
                <div style="font-family:monospace;font-size:8px;color:rgba(139,92,255,0.6);
                            letter-spacing:0.1em;margin-top:3px">
                  REDEEM_AT_CHECKOUT
                </div>
              </td>
            </tr>
          </table>
        </div>
      `).join('')}
    </div>
  ` : '';

  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:40px 0 28px">
      <div style="display:inline-block;width:68px;height:68px;border-radius:50%;
                  background:rgba(0,255,127,0.08);border:1px solid rgba(0,255,127,0.3);
                  line-height:68px;font-size:30px;margin-bottom:24px">
        📦
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00ff7f;margin-bottom:12px">
        // PACKAGE_DELIVERED
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        ORDER DELIVERED
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:12px;line-height:1.65">
        Your package has arrived, ${user.name}.<br>
        Thank you for choosing HUVVSM.
      </p>
    </div>

    <!-- ORDER REFERENCE -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:18px;margin-bottom:24px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:4px">
        ORDER_REF
      </div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;color:#8b5cff;letter-spacing:0.08em">
        #${shortId}
      </div>
    </div>

    <!-- POINTS EARNED -->
    ${pointsEarned > 0 ? `
    <div style="background:linear-gradient(135deg,rgba(0,229,255,0.07),rgba(0,229,255,0.02));
                border:1px solid rgba(0,229,255,0.2);border-radius:12px;
                padding:24px;margin-bottom:24px;text-align:center">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#00e5ff;margin-bottom:10px">
        ✦ LOYALTY_POINTS_CREDITED
      </div>
      <div style="font-family:monospace;font-size:40px;font-weight:900;color:#00e5ff;line-height:1;margin-bottom:6px">
        +${pointsEarned}
      </div>
      <div style="font-family:monospace;font-size:11px;letter-spacing:0.2em;color:#64748b">
        POINTS ADDED TO YOUR ACCOUNT
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:14px 0 0;line-height:1.6">
        Keep earning — view your balance and available coupons in your account.
      </p>
    </div>
    ` : ''}

    ${couponSection}

    <!-- CTA -->
    ${ctaButton('VIEW_MY_REWARDS →', `${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/auth.html`)}

    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;
               letter-spacing:0.1em;margin-top:24px">
      Need help?
      <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#00e5ff;text-decoration:none">
        ${process.env.SUPPORT_EMAIL}
      </a>
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `📦 Your order #${shortId} has been delivered — HUVVSM`,
    html
  });

  console.log(`[EMAIL] Delivery notification sent to ${user.email}`);
};

/* ============================================================ */
/* 4. REWARD COUPON EARNED EMAIL                                */
/* Triggered: when processRewards() generates new coupon(s)    */
/* ============================================================ */

export const sendRewardCouponEarned = async (user, coupons) => {
  if (!coupons || coupons.length === 0) return;

  const couponCards = coupons.map(c => `
    <div style="background:linear-gradient(135deg,rgba(139,92,255,0.08),rgba(0,229,255,0.03));
                border:1px dashed rgba(139,92,255,0.35);border-radius:14px;
                padding:24px;margin-bottom:16px;position:relative">
      <!-- Perforated dots -->
      <div style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);
                  width:16px;height:16px;border-radius:50%;background:#03040b;
                  border-right:1px dashed rgba(139,92,255,0.35)"></div>
      <div style="position:absolute;right:-8px;top:50%;transform:translateY(-50%);
                  width:16px;height:16px;border-radius:50%;background:#03040b;
                  border-left:1px dashed rgba(139,92,255,0.35)"></div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:middle">
            <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:6px">
              COUPON_CODE
            </div>
            <div style="font-family:monospace;font-weight:700;color:#00e5ff;font-size:18px;letter-spacing:0.08em">
              ${c.code}
            </div>
            <div style="font-family:monospace;font-size:9px;color:#475569;margin-top:6px;letter-spacing:0.05em">
              EXPIRES: ${new Date(c.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </td>
          <td style="text-align:right;vertical-align:middle">
            <div style="font-family:monospace;font-size:36px;font-weight:900;
                        color:#8b5cff;line-height:1">
              ${c.discountPercent}%
            </div>
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.12em;color:#8b5cff;margin-top:2px">
              OFF
            </div>
          </td>
        </tr>
      </table>
    </div>
  `).join('');

  const html = emailLayout(`
    <!-- HERO -->
    <div style="text-align:center;padding:40px 0 28px">
      <div style="display:inline-block;width:68px;height:68px;border-radius:16px;
                  background:rgba(139,92,255,0.1);border:1px solid rgba(139,92,255,0.3);
                  line-height:68px;font-size:28px;margin-bottom:24px">
        ✦
      </div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#8b5cff;margin-bottom:12px">
        // REWARD_THRESHOLD_REACHED
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f1f5f9;letter-spacing:-0.01em">
        YOUR COUPON IS READY
      </h1>
      <p style="color:#64748b;font-size:14px;margin-top:12px;line-height:1.65">
        You've earned ${coupons.length > 1 ? `${coupons.length} exclusive coupons` : 'an exclusive coupon'}, ${user.name}.<br>
        Use ${coupons.length > 1 ? 'them' : 'it'} at checkout to unlock your loyalty discount.
      </p>
    </div>

    <!-- COUPON CARDS -->
    <div style="margin-bottom:28px">
      ${couponCards}
    </div>

    <!-- HOW TO USE -->
    <div style="background:#0a0c14;border:1px solid #1a1d2e;border-radius:12px;
                padding:20px;margin-bottom:28px">
      <div style="font-family:monospace;font-size:9px;letter-spacing:0.25em;color:#475569;margin-bottom:14px">
        HOW_TO_REDEEM
      </div>
      <div style="display:flex;gap:0">
        <div style="flex:1;text-align:center;padding:0 12px">
          <div style="font-size:22px;margin-bottom:8px">🛍️</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.12em;color:#94a3b8">ADD TO CART</div>
        </div>
        <div style="flex:1;text-align:center;padding:0 12px;border-left:1px solid #1a1d2e">
          <div style="font-size:22px;margin-bottom:8px">💳</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.12em;color:#94a3b8">GO TO CHECKOUT</div>
        </div>
        <div style="flex:1;text-align:center;padding:0 12px;border-left:1px solid #1a1d2e">
          <div style="font-size:22px;margin-bottom:8px">✦</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.12em;color:#94a3b8">SELECT COUPON</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    ${ctaButton('SHOP_NOW →', `${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/shop.html`, '#8b5cff')}

    <p style="text-align:center;color:#334155;font-size:11px;font-family:monospace;
               letter-spacing:0.1em;margin-top:28px">
      Your coupons are also visible in your
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/pages/auth.html"
         style="color:#8b5cff;text-decoration:none">account rewards tab</a>.
    </p>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SIGNAL" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `✦ You've earned a reward coupon — HUVVSM`,
    html
  });

  console.log(`[EMAIL] Reward coupon email sent to ${user.email} (${coupons.length} coupon(s))`);
};

/* ============================================================ */
/* 5. SUPPORT EMAIL (existing — unchanged)                      */
/* ============================================================ */

export const sendSupportEmail = async ({ name, email, subject, message }) => {
  // 1. Forward to your support inbox
  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: process.env.SUPPORT_EMAIL,
    subject: `[SUPPORT] ${subject}`,
    html: `
      <div style="font-family:monospace;background:#03040b;color:#e2e8f0;padding:32px;border-radius:12px">
        <h2 style="color:#00e5ff;letter-spacing:0.1em">NEW_SUPPORT_SIGNAL</h2>
        <p><strong style="color:#8b5cff">FROM:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong style="color:#8b5cff">SUBJECT:</strong> ${subject}</p>
        <hr style="border-color:#1a1d2e;margin:16px 0">
        <p style="line-height:1.8;white-space:pre-wrap">${message}</p>
      </div>`
  });

  // 2. Auto-reply to the client
  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `SIGNAL_RECEIVED — We got your message`,
    html: emailLayout(`
      <div style="text-align:center;padding:40px 0 28px">
        <div style="font-size:36px;margin-bottom:16px">📡</div>
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
          // SIGNAL_RECEIVED
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Hi ${name},</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
          We've received your message and our team will get back to you within
          <strong style="color:#e2e8f0">24–48 hours</strong>.
        </p>
        <div style="background:#070810;border:1px solid #1a1d2e;border-radius:8px;
                    padding:16px;text-align:left;margin-bottom:16px">
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:8px">
            YOUR_MESSAGE
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
        </div>
        <p style="color:#475569;font-size:12px;margin:0">Need urgent help? Reply directly to this email.</p>
      </div>
    `)
  });

  console.log(`[EMAIL] Support ticket received from ${email}`);
};

export const sendEscalatedSupportEmail = async ({ name, email, username, orderNumber, subject, message, date, priority }) => {
  // 1. Forward to owner support inbox
  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: process.env.SUPPORT_EMAIL,
    subject: `[SUPPORT-ESCALATED] [${priority}] ${subject}`,
    html: `
      <div style="font-family:monospace;background:#03040b;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1a1d2e">
        <h2 style="color:#00e5ff;letter-spacing:0.1em;margin-top:0">✦ ESCALATED_SUPPORT_SIGNAL</h2>
        <hr style="border-color:#1a1d2e;margin:16px 0">
        <p><strong style="color:#8b5cff">CUSTOMER:</strong> ${name}</p>
        <p><strong style="color:#8b5cff">EMAIL:</strong> ${email}</p>
        <p><strong style="color:#8b5cff">USERNAME:</strong> ${username}</p>
        <p><strong style="color:#8b5cff">ORDER NUMBER:</strong> ${orderNumber || 'N/A'}</p>
        <p><strong style="color:#8b5cff">SUBJECT:</strong> ${subject}</p>
        <p><strong style="color:#8b5cff">DATE & TIME:</strong> ${date}</p>
        <p><strong style="color:#8b5cff">PRIORITY:</strong> <span style="color:${priority === 'High' ? '#ff4d6d' : '#00e5ff'};font-weight:bold">${priority.toUpperCase()}</span></p>
        <hr style="border-color:#1a1d2e;margin:20px 0">
        <p style="line-height:1.8;white-space:pre-wrap;background:#070810;padding:16px;border-radius:8px;border:1px solid #1a1d2e">${message}</p>
      </div>`
  });

  // 2. Auto-reply to client
  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `SIGNAL_RECEIVED — Support Ticket Registered`,
    html: emailLayout(`
      <div style="text-align:center;padding:40px 0 28px">
        <div style="font-size:36px;margin-bottom:16px">📡</div>
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
          // SIGNAL_RECEIVED
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Hi ${name},</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
          We have received your support request regarding <strong style="color:#00e5ff">"${subject}"</strong>.<br>
          Our support team will review your case and contact you as soon as possible.
        </p>
        <div style="background:#070810;border:1px solid #1a1d2e;border-radius:8px;
                    padding:16px;text-align:left;margin-bottom:16px">
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:8px">
            CASE_DETAILS
          </div>
          <table style="width:100%;font-size:13px;color:#94a3b8;margin-bottom:12px">
            <tr>
              <td style="padding:4px 0;width:120px"><strong style="color:#8b5cff">Order Number:</strong></td>
              <td>${orderNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0"><strong style="color:#8b5cff">Priority:</strong></td>
              <td style="color:${priority === 'High' ? '#ff4d6d' : '#00e5ff'}">${priority}</td>
            </tr>
          </table>
          <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:8px;border-top:1px solid #1a1d2e;padding-top:12px">
            DESCRIPTION
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
        </div>
        <p style="color:#475569;font-size:12px;margin:0">Need to add more details? Reply directly to this email.</p>
      </div>
    `)
  });

  console.log(`[EMAIL] Escalated support ticket received from ${email}`);
};

/* ============================================================ */
/* HUVVSM V2 — SUPPORT SYSTEM EMAILS                             */
/* ============================================================ */

// 1. Notify admins/owner of a new ticket
export const sendTicketCreatedEmail = async (recipients, ticket) => {
  const html = emailLayout(`
    <div style="padding:40px 0 28px">
      <div style="font-size:36px;text-align:center;margin-bottom:16px">📡</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#ff4d6d;text-align:center;margin-bottom:12px">
        // NEW_TICKET_ALERT
      </div>
      <h2 style="color:#f1f5f9;font-size:20px;text-align:center;margin:0 0 16px">New Support Ticket Generated</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
        A customer has escalated a support issue that requires staff intervention. Log in to the Command Center to respond.
      </p>
      <div style="background:#070810;border:1px solid #1a1d2e;border-radius:8px;padding:16px;margin-bottom:16px">
        <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:8px">
          TICKET_METADATA
        </div>
        <table style="width:100%;font-size:13px;color:#94a3b8;margin-bottom:12px">
          <tr>
            <td style="padding:4px 0;width:120px"><strong style="color:#8b5cff">Ticket ID:</strong></td>
            <td style="font-family:monospace;color:#00e5ff">${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding:4px 0"><strong style="color:#8b5cff">Customer:</strong></td>
            <td>${ticket.customerName} (${ticket.customerEmail})</td>
          </tr>
          <tr>
            <td style="padding:4px 0"><strong style="color:#8b5cff">Category:</strong></td>
            <td><span style="color:#ffc107">${ticket.category}</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0"><strong style="color:#8b5cff">Created:</strong></td>
            <td>${new Date(ticket.createdAt).toLocaleString('en-GB')}</td>
          </tr>
        </table>
        <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#475569;margin-bottom:8px;border-top:1px solid #1a1d2e;padding-top:12px">
          CUSTOMER_MESSAGE
        </div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${ticket.message}</p>
      </div>
      ${ctaButton('OPEN SUPPORT CENTER', 'http://localhost:5000/pages/admin.html', '#ff4d6d')}
    </div>
  `);

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: `"HUVVSM SIGNAL SYSTEM" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[ALERT] New Support Ticket Registered — ${ticket.category}`,
        html
      });
    } catch (err) {
      console.error(`[EMAIL ALERT FAILED] to ${email}`, err);
    }
  }
};

// 2. Notify customer of an admin reply
export const sendAdminReplyEmail = async (email, name, ticketId) => {
  const html = emailLayout(`
    <div style="padding:40px 0 28px;text-align:center">
      <div style="font-size:36px;margin-bottom:16px">📩</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
        // SUPPORT_REPLY_RECEIVED
      </div>
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Hello ${name},</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
        A member of the HUVVSM Support Team has responded to your ticket. Please log in to your account to review the transmission and continue the conversation.
      </p>
      ${ctaButton('VIEW INBOX', 'http://localhost:5000/pages/auth.html', '#00e5ff')}
    </div>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `SIGNAL_RECEIVED — HUVVSM Support Transmission`,
    html
  });
};

// 3. Notify customer of ticket status change (resolved/closed)
export const sendTicketStatusEmail = async (email, name, ticketId, status) => {
  const html = emailLayout(`
    <div style="padding:40px 0 28px;text-align:center">
      <div style="font-size:36px;margin-bottom:16px">🔒</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#8b5cff;margin-bottom:12px">
        // TICKET_STATUS_UPDATED
      </div>
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Ticket Status Update</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
        Your support ticket (ID: <span style="font-family:monospace;color:#00e5ff">${ticketId.slice(0,8)}</span>) has been marked as <strong style="color:#8b5cff">${status}</strong>.
      </p>
      ${ctaButton('VIEW TICKET HISTORY', 'http://localhost:5000/pages/auth.html', '#8b5cff')}
    </div>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `SIGNAL_STATUS — Support Ticket ${status}`,
    html
  });
};

// 4. Request customer satisfaction rating
export const sendRatingRequestEmail = async (email, name, ticketId) => {
  const html = emailLayout(`
    <div style="padding:40px 0 28px;text-align:center">
      <div style="font-size:36px;margin-bottom:16px">✦</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.3em;color:#00e5ff;margin-bottom:12px">
        // SERVICE_EVALUATION
      </div>
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Rate Your Support Experience</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
        Hello ${name}, your recent support ticket was marked as resolved. We strive to provide a premium support experience. Please take 10 seconds to submit a rating and let us know how we did.
      </p>
      ${ctaButton('SUBMIT RATING', `http://localhost:5000/pages/auth.html?tab=support&ticketId=${ticketId}&action=rate`, '#00e5ff')}
    </div>
  `);

  await transporter.sendMail({
    from: `"HUVVSM SUPPORT" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `FEEDBACK_REQUEST — Rate HUVVSM Support`,
    html
  });
};

export default transporter;