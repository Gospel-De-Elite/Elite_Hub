'use strict';

/**
 * Refresh Token Revocation Test
 *
 * Covers two revocation paths:
 *   1. logout-all  — all refresh tokens for a user revoked simultaneously
 *   2. password-reset — changing password invalidates every live session
 *
 * Failure mode caught: a refresh token issued before revocation still
 * works afterward, meaning a compromised credential never truly expires.
 */

const { http, login, section, pass, fail, assert, requiredEnv } = require('./setup');

async function refresh(refreshToken) {
  return http.post('/auth/refresh', { refreshToken });
}

async function run() {
  await requiredEnv(
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD'
  );

  // ── Test 1: logout-all ──────────────────────────────────────────────────
  section('Token Revocation — logout-all kills every live session');

  const session1 = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  const session2 = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);

  console.log('  Logged in on two simulated devices');

  // Logout-all from device 1
  const logoutRes = await http.post(
    '/auth/logout-all',
    {},
    { headers: { Authorization: `Bearer ${session1.accessToken}` } }
  );

  assert(
    logoutRes.status === 200,
    `logout-all succeeded (${logoutRes.status})`,
    `logout-all returned unexpected status (${logoutRes.status})`
  );

  await new Promise((r) => setTimeout(r, 300));

  // Device 1's refresh token should now be dead
  const replay1 = await refresh(session1.refreshToken);
  assert(
    replay1.status === 401,
    'Device 1 refresh token correctly rejected after logout-all',
    `Device 1 refresh token still valid after logout-all (status: ${replay1.status})`
  );

  // Device 2's refresh token must also be dead — this is the critical test
  const replay2 = await refresh(session2.refreshToken);
  assert(
    replay2.status === 401,
    'Device 2 refresh token also revoked by logout-all',
    `Device 2 refresh token survived logout-all (status: ${replay2.status})`,
    'A second active session was not invalidated — logout-all is incomplete'
  );

  // ── Test 2: password reset revokes all tokens ───────────────────────────
  section('Token Revocation — password change kills every live session');

  const preReset   = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  const preReset2  = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);

  console.log('  Logged in on two simulated devices');

  // Change password (authenticated endpoint, not the unauthenticated reset flow)
  const changeRes = await http.post(
    '/auth/change-password',
    {
      currentPassword: process.env.TEST_USER_PASSWORD,
      newPassword:     process.env.TEST_USER_PASSWORD, // same password, just triggering revocation
    },
    { headers: { Authorization: `Bearer ${preReset.accessToken}` } }
  );

  assert(
    changeRes.status === 200,
    `Password change accepted (${changeRes.status})`,
    `Password change failed (${changeRes.status}): ${JSON.stringify(changeRes.data)}`
  );

  await new Promise((r) => setTimeout(r, 300));

  // Both pre-change tokens must now be invalid
  const afterChange1 = await refresh(preReset.refreshToken);
  assert(
    afterChange1.status === 401,
    'Pre-change refresh token on device 1 revoked',
    `Pre-change refresh token on device 1 still valid (${afterChange1.status})`
  );

  const afterChange2 = await refresh(preReset2.refreshToken);
  assert(
    afterChange2.status === 401,
    'Pre-change refresh token on device 2 revoked',
    `Pre-change refresh token on device 2 still valid (${afterChange2.status})`,
    'Session on a second device survived a password change — security gap'
  );

  // ── Test 3: single-device logout leaves other sessions intact ───────────
  section('Token Revocation — single logout only kills one token');

  const devA = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  const devB = await login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);

  await http.post('/auth/logout', { refreshToken: devA.refreshToken });

  await new Promise((r) => setTimeout(r, 300));

  const afterSingleA = await refresh(devA.refreshToken);
  assert(
    afterSingleA.status === 401,
    'Logged-out device token correctly rejected',
    `Logged-out device token still valid (${afterSingleA.status})`
  );

  const afterSingleB = await refresh(devB.refreshToken);
  assert(
    afterSingleB.status === 200,
    'Other device token still valid after single logout',
    `Other device token incorrectly invalidated by single logout (${afterSingleB.status})`
  );

  // Clean up devB session
  if (afterSingleB.status === 200) {
    await http.post('/auth/logout', { refreshToken: devB.refreshToken });
  }
}

run().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
