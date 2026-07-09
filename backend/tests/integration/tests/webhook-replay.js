'use strict';

/**
 * Webhook Replay Prevention Test
 *
 * Sends the same Paystack webhook payload twice using the same
 * gateway_reference. The processed_webhooks unique constraint must
 * prevent the second delivery from crediting the wallet a second time.
 *
 * Failure mode caught: wallet credited twice from one payment, turning
 * a ₦5,000 deposit into ₦10,000 simply by replaying the webhook.
 */

const crypto = require('crypto');
const { http, login, getWallet, section, pass, fail, assert, requiredEnv } = require('./setup');

async function paystackSignature(payload, secret) {
  return crypto.createHmac('sha512', secret).update(payload).digest('hex');
}

async function run() {
  await requiredEnv(
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'PAYSTACK_SECRET'
  );

  section('Webhook Replay — duplicate gateway event must not double-credit');

  const { user, accessToken } = await login(
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_PASSWORD
  );

  const walletBefore  = await getWallet(accessToken);
  const balanceBefore = parseFloat(walletBefore.balance);
  console.log(`  Balance before: ₦${balanceBefore.toLocaleString('en-NG')}`);

  // Craft a realistic Paystack charge.success webhook.
  // The gateway_reference must be unique per real payment but deliberately
  // reused here to simulate a replay attack or accidental double-delivery.
  const gatewayReference = `test_replay_${Date.now()}`;
  const creditAmount     = 500000; // ₦5,000 in kobo

  const payload = JSON.stringify({
    event: 'charge.success',
    data:  {
      status:    'success',
      reference: gatewayReference,
      amount:    creditAmount,
      customer:  { email: user.email },
      metadata:  {},
    },
  });

  const signature = await paystackSignature(payload, process.env.PAYSTACK_SECRET);
  const headers   = {
    'x-paystack-signature': signature,
    'content-type': 'application/json',
  };

  console.log(`  Sending webhook #1 (reference: ${gatewayReference})…`);
  const res1 = await http.post('/webhooks/paystack', payload, { headers });
  console.log(`  Response #1: ${res1.status}`);

  // A brief pause so the first event fully commits before the replay lands.
  await new Promise((r) => setTimeout(r, 800));

  console.log(`  Sending webhook #2 (same reference — replay)…`);
  const res2 = await http.post('/webhooks/paystack', payload, { headers });
  console.log(`  Response #2: ${res2.status}`);

  await new Promise((r) => setTimeout(r, 400));

  const walletAfter  = await getWallet(accessToken);
  const balanceAfter = parseFloat(walletAfter.balance);
  const credited     = balanceAfter - balanceBefore;
  console.log(`  Balance after : ₦${balanceAfter.toLocaleString('en-NG')}`);
  console.log(`  Net credited  : ₦${credited.toLocaleString('en-NG')}`);

  // The first webhook should have been accepted (200 or 202).
  assert(
    [200, 201, 202].includes(res1.status),
    `First webhook accepted (${res1.status})`,
    `First webhook unexpectedly rejected (${res1.status})`,
    'The legitimate payment webhook should always be accepted'
  );

  // Only one credit of ₦5,000 should have landed.
  const expectedCredit = creditAmount / 100; // kobo → naira
  assert(
    Math.abs(credited - expectedCredit) < 1,
    `Wallet credited exactly once (₦${expectedCredit.toLocaleString('en-NG')})`,
    `Wallet credited ${credited / expectedCredit}× — replay prevention failed`,
    `Expected ₦${expectedCredit}, net change was ₦${credited}`
  );
}

run().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
