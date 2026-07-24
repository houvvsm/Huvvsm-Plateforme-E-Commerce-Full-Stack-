# HUVVSM — LUXURY DIGITAL IDENTITY SYSTEM

## Modern Minimalist Fashion Engine v2.0

A full-stack fashion e-commerce platform combining modern UI/UX, secure authentication, inventory management, order processing, a premium loyalty ecosystem, staff audits, a unified branded email system, and an AI-powered customer support center.

---

# 📁 SYSTEM ARCHITECTURE

```text
huvvsm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── scripts/
│   │   └── promoteOwner.js           ← CLI maintenance tool
│   │
│   └── src/
│       ├── admin/
│       │   ├── adminController.js
│       │   ├── adminRoutes.js
│       │   ├── staffController.js
│       │   └── staffRoutes.js
│       │
│       ├── config/
│       │   ├── db.js
│       │   └── email.js              ← Branded HTML email templates + AI escalation
│       │
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── productController.js
│       │   ├── cartController.js
│       │   ├── wishlistController.js
│       │   ├── reviewController.js
│       │   ├── rewardsController.js
│       │   └── Ordercontroller.js
│       │
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   └── uploadMiddleware.js
│       │
│       └── routes/
│           ├── authRoutes.js
│           ├── productRoutes.js
│           ├── cartRoutes.js
│           ├── wishlistRoutes.js
│           ├── reviewRoutes.js
│           ├── orderRoutes.js
│           ├── rewardsRoutes.js
│           └── Supportroutes.js      ← AI chat + escalation endpoints
│
└── frontend/
    ├── pages/
    │   ├── index.html
    │   ├── shop.html
    │   ├── product.html
    │   ├── cart.html
    │   ├── checkout.html
    │   ├── auth.html
    │   ├── lookbook.html
    │   ├── admin.html
    │   └── Support.html              ← Premium AI Support Center
    │
    ├── css/
    │   ├── globals.css
    │   └── mobile.css
    │
    └── js/
        ├── globals.js
        ├── script.js
        └── page-specific modules
```

---

# 🚀 CORE FEATURES

## 1. Authentication & Identity System

* User Registration & Login
* JWT Authentication
* Persistent Sessions
* Protected Routes
* **Identity Portal**: Enhanced tabbed dashboard for Wishlist, Order History, and Loyalty Rewards.
* **Verified Purchase Reviews**: Authenticated feedback loop for customers.

---

## 2. Product Management System

### Customer Features
* Product Catalogue & Dynamic Category Filters (`Huvvsm`, `Anime`, `Gym`)
* Product Details Page with Dynamic Per-Size Availability Matrix
* Out-of-Stock Size Indicators (`.size-btn--oos`) with interactive `"OUT OF STOCK"` hover tooltips
* Multiple Product Images & Interactive Thumbnail Viewer
* Responsive Product Grid
* **Specimen Ratings**: Integrated user reviews and star-based ratings
* Real-Time Stock Status & Toast Feedback (`Added to cart`)

### Admin COMMAND_CENTER
* **Inventory Control**: Create, Edit, and Delete products with multi-image support.
* **SIZE_STOCK_MATRIX**: Per-size inventory management (`S`, `M`, `L`, `XL`) stored as JSON, auto-calculating total product stock.
* **Inventory Table Size Badges**: Real-time color-coded stock chips (`🟢 ok / 🟡 low / 🔴 oos`) per size variant.
* **SIGNAL_HISTORY (Order OMS)**: Real-time management of orders.
* **FEEDBACK_LOGS**: Centralized moderation terminal to monitor and delete inappropriate reviews.
* **SYSTEM_PARAMS**: Operational dashboard showing system metadata, color legends, and session settings.

---

## 3. Shopping Cart System

* Add to Cart & Remove from Cart
* Quantity Management
* Local Persistence
* Database Synchronization
* Automatic Cart Merge After Login

---

## 4. Integrated Checkout Gateway

* Secure Checkout Flow
* Real-Time Total Calculation
* Shipping Calculation
* Order Creation
* Transaction Validation
* **Loyalty Discount Coupon Application**: Dropdown selection showing the customer's available coupons to apply discounts instantly.

---

## 5. Order Management System (OMS)

### Order Workflow
PENDING → CONFIRMED → SHIPPED → DELIVERED (Reversed on CANCELLED)

### Transactional Integrity & Atomic Decrements
Orders are processed using Prisma Transactions to guarantee inventory consistency, safe decrementing, and cart deletion.

---

## 6. Staff Management & Audit Logging (Owner Only)

A premium administrator monitoring and security control tier:
* **Compact Statistics**: Live counters displaying total admins, active admins, and suspended admins populated directly from the PostgreSQL instance.
* **Granular Audit Logs**: Records administrative actions (`ADMIN_CREATED`, `ADMIN_UPDATED`, `ADMIN_SUSPENDED`, `ADMIN_REACTIVATED`) inside the database, registering:
  * Owner Identity (performing the action)
  * Target Administrator Profile (affected account)
  * Timestamp & Status logs

---

## 7. Loyalty Rewards Ecosystem

A premium customer loyalty program focused on retention and automated reward triggers:
* **Point Accrual**: Awarded automatically *only* when an order is successfully marked as `DELIVERED`. Rates are configurable (default: `10 DH = 1 point`).
* **Automated Points Reversal**: Points are reversed automatically if an order transitions to `CANCELLED`, preserving financial integrity.
* **Progress HUD**: High-fidelity dashboard mapping current point levels to the next reward milestone via an interactive gradient progress bar.
* **Auto-generated Coupons**: Recursively converts points to discount codes (`HUV-REV-XXXXXX`) when thresholds are crossed (e.g. 100 points = 5% off).
* **Loyalty Dashboard**: Admin panel to set conversion rates, add/remove threshold multipliers, track customers, and inspect coupon ledgers.

---

## 8. Branded HTML Email Notification System

Dispatches responsive, dark-themed HTML emails built with HUVVSM design rules (gradients, monospace tags, clean layouts) using Nodemailer:
1. **Welcome Email**: Welcomes the customer on registration and introduces the Rewards structure.
2. **Order Confirmation**: Displays detailed order manifests, total billing, delivery address parameters, payment method, and shipping timeline.
3. **Order Delivered**: Notifies users of delivery arrival, lists loyalty points earned, and lists newly generated coupons.
4. **Reward Coupon Earned**: Dedicated template highlighting code credentials, discount percentages, validation duration, and redemption guides.
5. **Support Ticket (Escalated)**: Sends a structured ticket to the brand owner with customer info, priority badge, order reference, and full issue description. Automatically sends a branded confirmation email back to the customer.

---

## 9. Product Review & Feedback System

* 1-5 Star Rating System
* Verified Purchase Lock (Only purchasers can write reviews)
* Homepage Global Feed
* Per-product Review Analytics

---

## 10. High-Performance Motion System

* GSAP Animations & ScrollTrigger Integration
* Lenis Smooth Scrolling
* Cinematic Reveal Effects
* Interactive Cursor System

---

## 11. AI Customer Support Center ✦ NEW

A domain-restricted AI support assistant powered by **Google Gemini**, integrated natively into the HUVVSM ecosystem.

### AI Chat Interface
* Premium glassmorphism chat UI with animated chat bubbles, auto-scroll, and a 3-dot typing indicator
* Suggested quick-question chips for the most common support queries
* Real-time conversation history passed to the model for full context awareness

### Domain Restriction (Server-Side Enforced)
The AI only answers questions within these topics:

| Allowed Topics |
|---|
| Orders, Shipping, Delivery |
| Returns & Refunds |
| Product availability & sizes |
| Loyalty points & reward coupons |
| Account management & password reset |
| Wishlist & Shopping cart |
| Reviews |
| Payments |
| Contact information |

Any off-topic request (general knowledge, maths, coding, politics, etc.) is politely refused:
> *"I can only assist you with HUVVSM products, orders, shipping, loyalty rewards, account management, and other store-related questions."*

### Smart Escalation Engine
The AI automatically detects complex or unresolvable issues and escalates to a human:

**Escalation Triggers:**
- Damaged product received
- Wrong item received
- Order never arrived
- Payment charged twice
- Explicit human agent request ("I want to speak with someone")
- Conversation loop detected (>4 turns unresolved)

When escalated, the chat smoothly **transitions** (GSAP animation) to a structured contact form — no page reload.

### Escalation Form (Context-Aware)
| User Type | Auto-filled | Manual |
|---|---|---|
| **Logged In** | Name, Email, Username (read-only), latest Order # | Subject, Description |
| **Guest** | — | Name, Email, Username, Order # (optional), Subject, Description |

The description field is **pre-populated** with the full AI chat transcript.

### Priority Auto-Detection (Server-Side)
The `/escalate` endpoint auto-assigns priority by scanning for keywords:

| Priority | Trigger Keywords |
|---|---|
| 🔴 **High** | double charge, damage, wrong, never arrived, missing, urgent, fraud, stolen, human |
| 🔵 **Normal** | All other requests |

### API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/support` | Legacy contact form |
| `POST` | `/api/v1/support/chat` | AI chat (Gemini `gemini-1.5-flash`) |
| `POST` | `/api/v1/support/escalate` | Human escalation ticket + dual emails |

---

# 🗄 DATABASE MODELS

## User
* id, name, email, password, role, isActive, lastLogin, points, createdAt

## Product
* id, name, description, price, category, tag, stock, sizeStock, images, createdAt, updatedAt

## Review
* id, userId, productId, rating, comment, createdAt

## CartItem
* id, userId, productId, quantity, size

## WishlistItem
* id, userId, productId

## Order
* id, userId, status, total, discount, pointsAwarded, couponId, createdAt

## OrderItem
* id, orderId, productId, quantity, size, price

## Coupon
* id, code, discountPercent, userId, isRedeemed, redeemedAt, expiresAt, createdAt

## RewardHistory
* id, userId, points, description, createdAt

## RewardsConfig
* id, dhPerPoint, updatedAt

## RewardThreshold
* id, pointsNeeded, discountPercent, createdAt

## StaffAuditLog
* id, action, ownerId, ownerName, targetId, targetName, targetEmail, createdAt

---

# 🔐 SECURITY

* JWT Session Authentication
* Bcrypt Password Hashing
* Role-Based Access Control (RBAC: USER, ADMIN, OWNER)
* Transactional Isolation & Database Lock Integrity
* AI domain restrictions enforced server-side (cannot be bypassed from the frontend)

---

# ⚙️ ENVIRONMENT VARIABLES

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
NODE_ENV=development
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
SUPPORT_EMAIL=owner_inbox@gmail.com
GEMINI_API_KEY=your_gemini_api_key_here     ← Required for AI Support Center
```

> Get your free Gemini API key at: https://aistudio.google.com/apikey

---

# 🎨 DESIGN SYSTEM

## Color Tokens
```css
--c1: #5af3ff;        /* Neon Cyan Accent */
--c2: #8b5cff;        /* Cyber Purple Accent */
--live: #00ffc4;      /* Success/Active Accent */
```

## Typography
```css
--font-display: 'Space Grotesk';
--font-body: 'Plus Jakarta Sans';
--font-labels: 'Space Mono';
```

---

© 2026 HUVVSM — ALL RIGHTS RESERVED
