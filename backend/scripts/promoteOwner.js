/* ============================================================ */
/* HUVVSM — PROMOTE EXISTING ACCOUNT TO OWNER                   */
/* backend/scripts/promoteOwner.js                              */
/*                                                                */
/* Use this INSTEAD of seedOwner.js when you already have an     */
/* existing account (e.g. your current ADMIN) that should        */
/* become the OWNER, rather than creating a brand new user.      */
/*                                                                */
/* This is still the ONLY place besides seedOwner.js that can     */
/* ever produce an OWNER — no API route can do this.              */
/*                                                                */
/* Usage:                                                         */
/*   OWNER_EMAIL="your-existing-account@huvvsm.com" \             */
/*   node backend/scripts/promoteOwner.js                         */
/* ============================================================ */

import { prisma } from '../src/config/db.js';

async function promoteOwner() {
  const email = process.env.OWNER_EMAIL;

  if (!email) {
    console.error('[PROMOTE_OWNER] Missing OWNER_EMAIL env var.');
    process.exit(1);
  }

  const existingOwner = await prisma.user.count({ where: { role: 'OWNER' } });
  if (existingOwner > 0) {
    console.error('[PROMOTE_OWNER] An OWNER account already exists. Refusing to create a second one.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`[PROMOTE_OWNER] No account found with email ${email}.`);
    process.exit(1);
  }

  if (user.role === 'OWNER') {
    console.log('[PROMOTE_OWNER] This account is already OWNER. Nothing to do.');
    process.exit(0);
  }

  const promoted = await prisma.user.update({
    where: { email },
    data: { role: 'OWNER', isActive: true }
  });

  console.log(`[PROMOTE_OWNER] ${promoted.email} (${promoted.id}) is now the OWNER.`);
  console.log('[PROMOTE_OWNER] Backend authorization takes effect immediately (role is read fresh from the DB on every request).');
  console.log('[PROMOTE_OWNER] They just need to log out and back in so the frontend refreshes its cached user/role in localStorage.');
  process.exit(0);
}

promoteOwner().catch(err => {
  console.error('[PROMOTE_OWNER] Failed:', err);
  process.exit(1);
});
