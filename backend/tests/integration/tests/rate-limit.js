'use strict';

/**
 * Rate Limit Test
 *
 * Verifies that each rate-limited surface enforces its configured ceiling:
 *
 *   - Auth limiter    : 10 attempts / 15 minutes (tested with bad credentials)
 *   - General limiter : 100 requests / minute
 *   - API key limiter : role-tiered (CUSTOMER = 100/min, keyed per API key)
 *   - Support chat    : 20 messages / minute
 *
 * Strategy: fire requests slightly above each ceiling and confirm a 429
 * appears within the window. We don't hammer the full 100+ — just enough
 * to cross the threshold and verify the right status code and headers come
 * back.
 *
 * Note: the auth limiter window is 15 minutes, so if you've already hit it
 * recently on the TEST_USER2_EMAIL account this test will appear to pass
 * trivially (the 429 will fire immediately). That's fine — it proves the
 * limiter is working, just from a previous run.
 */

const { http, login, section, pass, fail, assert, requiredEnv, BASE } = require('./setup');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fireN(n, reqFn) {
  const results = [];
  for (let i = 0; i < n; i++) {
    results.push(await reqFn(i));
    // Small stagger so we don't overwhelm the local event loop,
    // but fast enough to stay within a 1-minute window.
    await sleep(20);
  }
  return results;
}

async function run() {
  await requiredEnv('TEST_USER_EMAIL', 'TEST_USER_PASSWORD');

  // ── Auth limiter ─────────────────────────────────────────────────────────
  section('Rate Limit — auth endpoint (10 attempts / 15 min)');

  // Use a dedicated throwaway email so bad-credential attempts don't
  // pollute the main test user's lockout state.
  const authResults = await fireN(12, () =>
    http.post('/auth/login', {
      email:    'ratelimit-probe@test.invalid',
      password: 'wrongpassword',
    })
  );

  const auth429 = authResults.find((r) => r.status === 429);
  assert(
    !!auth429,
    'Auth limiter fires 429 after threshold (10 bad attempts)',
    'No 429 received after 12 auth attempts — auth limiter may not be configured',
    'Expected a 429 after the 10th failed login attempt within 15 minutes'
  );

  if (auth429) {
    const retryHeader = auth429.headers['retry-after'] || auth429.headers['x-ratelimit-reset'];
    assert(
      !!retryHeader,
      `429 includes rate-limit header (retry-after or x-ratelimit-reset)`,
      '429 missing retry-after / x-ratelimit-reset header'
    );
  }

  // ── General API limiter ───────────────────────────────────────────────────
  section('Rate Limit — general API limiter (100 req / min)');

  // The general limiter is shared across all endpoints and keyed by IP.
  // We hit /health because it's the cheapest endpoint and bypasses auth.
  // 105 requests in quick succession should yield at least one 429.
  console.log('  Firing 105 requests to /health…');
  const generalResults = await fireN(105, () =>
    http.get('/health')
  );

  const general429 = generalResults.find((r) => r.status === 429);
  assert(
    !!general429,
    `General limiter fires 429 after 100 requests`,
    'No 429 received after 105 requests — general limiter may not be enforcing',
    'Check that generalLimiter is wired to app.use() in app.js'
  );

  // ── Support chat limiter ─────────────────────────────────────────────────
  section('Rate Limit — support chat (20 messages / min, keyed per user)');

  const { accessToken } = await login(
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_PASSWORD
  );

  console.log('  Firing 22 chat messages…');
  const chatResults = await fireN(22, () =>
    http.post(
      '/support/chat/message',
      { message: 'rate limit probe' },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
  );

  const chat429 = chatResults.find((r) => r.status === 429);
  assert(
    !!chat429,
    'Support chat limiter fires 429 after 20 messages',
    'No 429 received after 22 chat messages — supportChatLimiter may not be wired',
    'Check support.routes.js uses supportChatLimiter before the message handler'
  );

  // ── API key limiter (developer public API) ────────────────────────────────
  section('Rate Limit — public API key limiter (CUSTOMER tier: 100 / min)');

  if (!process.env.TEST_API_KEY || !process.env.TEST_API_SECRET) {
    console.log('  Skipping: TEST_API_KEY / TEST_API_SECRET not set in .env');
    console.log('  Generate a key from /dashboard/api/keys and add to .env to run this check.');
  } else {
    const credential = `${process.env.TEST_API_KEY}.${process.env.TEST_API_SECRET}`;

    console.log('  Firing 105 requests to /public/orders/nonexistent…');
    const apiResults = await fireN(105, () =>
      http.get('/public/orders/EH-ORD-doesnotexist', {
        headers: { Authorization: `Bearer ${credential}` },
      })
    );

    // 404 is the expected success response (order doesn't exist), 429 = rate limit hit
    const api429 = apiResults.find((r) => r.status === 429);
    assert(
      !!api429,
      'Public API key limiter fires 429 after 100 requests',
      'No 429 from API key limiter after 105 requests',
      'Check apiRateLimiter is applied in publicApi.routes.js'
    );
  }
}

run().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
