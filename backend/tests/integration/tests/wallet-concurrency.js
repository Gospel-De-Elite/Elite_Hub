'use strict';

/**
 * Wallet Concurrency Test
 *
 * Fires N simultaneous purchase requests against the same wallet balance.
 * The row-level lock in wallet.service.js must serialize them — only as many
 * orders should succeed as the balance actually covers, and the final balance
 * must never go negative.
 *
 * Failure mode caught: two concurrent requests both pass the balance check
 * before either has committed its debit, allowing the wallet to be
 * overdrafted.
 */

const { http, login, getWallet, section, pass, fail, assert, requiredEnv } = require('./setup');

const CONCURRENT_REQUESTS = 10;

async function run() {
  await requiredEnv(
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_PRODUCT_ID'
  );

  section('Wallet Concurrency — simultaneous purchase race condition');

  const { accessToken } = await login(
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_PASSWORD
  );

  const walletBefore = await getWallet(accessToken);
  const balanceBefore = parseFloat(walletBefore.spendableBalance);
  console.log(`  Balance before: ₦${balanceBefore.toLocaleString('en-NG')}`);

  if (balanceBefore < 100) {
    fail(
      'Pre-condition',
      `Wallet balance too low (₦${balanceBefore}). Fund this account with at least ₦1,000 before running.`
    );
    return;
  }

  // Fire all requests at exactly the same time — Promise.all with no await
  // in between is the closest we can get to true simultaneous from a single
  // process, which is enough to expose missing row-level locking.
  console.log(`\n  Firing ${CONCURRENT_REQUESTS} simultaneous purchase requests…`);

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, () =>
      http.post(
        '/orders/airtime',
        { productId: process.env.TEST_PRODUCT_ID, recipientNumber: '08012345678' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    )
  );

  const successes = results.filter((r) => r.status === 201);
  const failures  = results.filter((r) => r.status !== 201);

  console.log(`  Successes : ${successes.length}`);
  console.log(`  Failures  : ${failures.length}`);

  const walletAfter  = await getWallet(accessToken);
  const balanceAfter = parseFloat(walletAfter.spendableBalance);
  console.log(`  Balance after: ₦${balanceAfter.toLocaleString('en-NG')}`);

  // The balance must never go negative regardless of how many requests succeeded.
  assert(
    balanceAfter >= 0,
    'Balance remained non-negative (row-level lock held)',
    'Balance went negative — race condition in wallet deduction',
    `Expected >= 0, got ₦${balanceAfter}`
  );

  // Each successful order should have a corresponding debit — verify no
  // order succeeded against a balance that was already exhausted.
  const expectedBalance = balanceBefore - successes.length * 100; // ₦100 per airtime order
  const drift = Math.abs(balanceAfter - expectedBalance);

  assert(
    drift < 1, // allow 1 naira rounding tolerance
    `Balance matches expected deductions (${successes.length} × ₦100)`,
    `Balance mismatch — possible double-debit`,
    `Expected ≈₦${expectedBalance}, got ₦${balanceAfter} (drift: ₦${drift.toFixed(2)})`
  );

  // At least one request should have been rejected (insufficient funds
  // after the first few succeed) — if ALL succeeded on a ₦1,000 wallet
  // that should only cover 10 × ₦100, that's suspiciously clean.
  if (balanceBefore < CONCURRENT_REQUESTS * 100) {
    assert(
      failures.length > 0,
      'Some requests correctly rejected after balance exhausted',
      'All requests succeeded despite insufficient balance — possible double-spend',
      'Every request returned 201 even though balance could not cover all of them'
    );
  }
}

run().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
