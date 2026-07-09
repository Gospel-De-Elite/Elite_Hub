'use strict';

require('dotenv').config();
const axios = require('axios');

const BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

// ── Output helpers ────────────────────────────────────────────────────────────

function pass(label) {
  console.log(`  ✓  ${label}`);
}

function fail(label, detail) {
  console.error(`  ✗  ${label}`);
  if (detail) console.error(`     ${detail}`);
  process.exitCode = 1;
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function assert(condition, passLabel, failLabel, detail) {
  condition ? pass(passLabel) : fail(failLabel, detail);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

const http = axios.create({ baseURL: BASE, validateStatus: () => true });

async function login(email, password) {
  const res = await http.post('/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.data; // { user, accessToken, refreshToken }
}

async function getWallet(accessToken) {
  const res = await http.get('/wallet', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status !== 200) throw new Error(`getWallet failed: ${res.status}`);
  return res.data.data;
}

async function requiredEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\nMissing required env vars: ${missing.join(', ')}`);
    console.error('Copy PLACEMENT.md > Configuration section into .env and fill in the values.\n');
    process.exit(1);
  }
}

module.exports = { BASE, http, login, getWallet, pass, fail, section, assert, requiredEnv };
