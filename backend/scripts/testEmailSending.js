import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderDelivered,
  sendRewardCouponEarned
} from '../src/config/email.js';

async function test() {
  console.log('--- STARTING EMAIL SYSTEM TESTING ---');

  const testUser = {
    name: 'Neo Identity Test',
    email: 'huvvsm.contact@gmail.com'
  };

  const testOrder = {
    id: 'f83a2d1e-bf43-424a-ae9d-927492cfa78d',
    total: 1250,
    discount: 50,
    address: 'Node X // Street Y // Sector 9',
    city: 'Casablanca',
    paymentMethod: 'on_delivery',
    createdAt: new Date(),
    items: [
      {
        product: { name: 'VOID SIGNAL HOODIE' },
        size: 'L',
        quantity: 1,
        price: 1250
      }
    ]
  };

  const testCoupons = [
    {
      code: 'HUV-REV-X9Y2Z8',
      discountPercent: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ];

  try {
    console.log('1. Sending Welcome Email...');
    await sendWelcomeEmail(testUser);

    console.log('2. Sending Order Confirmation...');
    await sendOrderConfirmation(testOrder, testUser);

    console.log('3. Sending Order Delivered Email (with new coupon)...');
    await sendOrderDelivered(testOrder, testUser, 125, testCoupons);

    console.log('4. Sending Reward Coupon Earned Email...');
    await sendRewardCouponEarned(testUser, testCoupons);

    console.log('--- EMAIL SYSTEM TESTING COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Email system test failed:', err);
  }
}

test();
