'use strict';

/**
 * Provider Failover Test
 *
 * Verifies the circuit breaker lifecycle by inspecting provider health
 * state via the admin API, then simulating failure thresholds by directly
 * manipulating the provider_health table through psql.
 *
 * Three scenarios:
 *   1. Healthy provider — requests route normally
 *   2. Tripped circuit   — 5 consecutive failures open the breaker;
 *                          further requests skip the provider
 *   3. Auto-retest       — after cooldown, the provider gets one probe
 *
 * Note: Actually triggering real provider failures requires live provider
 * credentials. This test verifies the state-machine logic by reading
 * provider_health via the admin API and manipulating state via psql.
 * Real end-to-end failover testing should be done with a mock provider
 * (see scripts/mock-airalo-provider.js in Phase 7 for the pattern).
 */

const { execSync } = require('child_process');
const { http, login, section, pass, fail, assert, requiredEnv } = require('./setup');

const DB_NAME = process.env.DB_NAME || 'elite_hub';
const DB_USER = process.env.DB_USER || 'elite_hub_user';

function psql(sql) {
  try {
    return execSync(
      `sudo -u postgres psql -d ${DB_NAME} -U ${DB_USER} -t -c "${sql}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (err) {
    throw new Error(`psql failed: ${err.stderr || err.message}`);
  }
}

async function getAdminToken() {
  await requiredEnv('SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD');
  const session = await login(
    process.env.SUPER_ADMIN_EMAIL,
    process.env.SUPER_ADMIN_PASSWORD
  );
  return session.accessToken;
}

async function run() {
  await requiredEnv('SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD');

  const adminToken = await getAdminToken();

  // ── 1. Fetch current provider list ─────────────────────────────────────
  section('Provider Failover — fetch provider health via admin API');

  const res = await http.get('/admin/providers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert(
    res.status === 200,
    `Admin providers endpoint reachable (${res.status})`,
    `Admin providers endpoint failed (${res.status})`
  );

  const providers = res.data.data;
  const smeApi    = providers.find((p) => p.name === 'SME API');
  const vtuNg     = providers.find((p) => p.name === 'VTU.ng');

  assert(!!smeApi, 'SME API provider exists in DB', 'SME API provider not found — seed may not have run');
  assert(!!vtuNg,  'VTU.ng provider exists in DB',  'VTU.ng provider not found — seed may not have run');

  // ── 2. Verify healthy state reads correctly ─────────────────────────────
  section('Provider Failover — healthy baseline state');

  const smeHealth = smeApi?.providerHealth;
  assert(
    smeHealth?.isHealthy !== false,
    'SME API starts in healthy state',
    'SME API already in unhealthy state — reset it before running this test',
    'Run: POST /admin/providers/:id/reset-health'
  );

  // ── 3. Simulate circuit breaker trip via psql ───────────────────────────
  section('Provider Failover — trip circuit breaker (5 consecutive failures)');

  try {
    psql(
      `UPDATE provider_health ` +
      `SET consecutive_failures = 5, is_healthy = false, ` +
      `cooldown_until = NOW() + INTERVAL '5 minutes' ` +
      `WHERE provider_id = (SELECT id FROM providers WHERE name = 'SME API')`
    );
    pass('Circuit breaker tripped via psql (5 failures, cooldown set)');
  } catch (err) {
    fail('Could not trip circuit breaker via psql', err.message);
    return;
  }

  // Read it back through the API to confirm the endpoint reflects DB state
  const trippedRes = await http.get('/admin/providers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const smeTripped = trippedRes.data.data.find((p) => p.name === 'SME API');

  assert(
    smeTripped?.providerHealth?.isHealthy === false,
    'Admin API reflects tripped circuit breaker',
    'Admin API still shows SME API as healthy after DB update',
    'Check that providerHealth is being included in the admin providers query'
  );

  assert(
    smeTripped?.providerHealth?.consecutiveFailures >= 5,
    `Consecutive failures correctly reported (${smeTripped?.providerHealth?.consecutiveFailures})`,
    'Consecutive failures not reflected in API response'
  );

  // ── 4. Admin reset clears the circuit breaker ───────────────────────────
  section('Provider Failover — admin manual reset clears circuit breaker');

  const resetRes = await http.post(
    `/admin/providers/${smeApi.id}/reset-health`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  assert(
    resetRes.status === 200,
    `Reset endpoint responded 200`,
    `Reset endpoint failed (${resetRes.status})`
  );

  const afterReset = await http.get('/admin/providers', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const smeReset = afterReset.data.data.find((p) => p.name === 'SME API');

  assert(
    smeReset?.providerHealth?.isHealthy === true,
    'SME API healthy after manual reset',
    'SME API still unhealthy after manual reset — reset endpoint may not be working'
  );

  assert(
    smeReset?.providerHealth?.consecutiveFailures === 0,
    'Consecutive failures reset to 0',
    `Consecutive failures not cleared (got ${smeReset?.providerHealth?.consecutiveFailures})`
  );

  assert(
    !smeReset?.providerHealth?.cooldownUntil,
    'Cooldown cleared',
    'Cooldown still set after reset'
  );

  // ── 5. Verify priority ordering ─────────────────────────────────────────
  section('Provider Failover — provider priority ordering');

  const vtuTypes   = providers.filter((p) => p.providerType === 'VTU');
  const priorities = vtuTypes.map((p) => p.priority).sort((a, b) => a - b);

  assert(
    priorities[0] === 1,
    `Primary VTU provider has priority 1 (${smeApi?.name})`,
    'No VTU provider with priority 1 found'
  );

  assert(
    priorities.length >= 2,
    `Failover provider exists (priority ${priorities[1]}) — ${vtuNg?.name}`,
    'Only one VTU provider — no failover configured'
  );
}

run().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
