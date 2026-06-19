// Manual verification script for the locked_balance lifecycle.
// Run with: node scripts/test-wallet-lock.js <userId>
//
// This exists because the real trigger for lockFunds/settleDebit/releaseLock
// is the order engine, which doesn't land until Phase 4. This script proves
// the wallet primitives behave correctly in isolation before that exists.

require("dotenv").config();
const prisma = require("../src/common/config/prisma");
const walletService = require("../src/modules/wallets/wallet.service");

async function printWallet(label, userId) {
  const wallet = await walletService.getWallet(userId);
  console.log(`\n--- ${label} ---`);
  console.log(`balance:          ${wallet.balance}`);
  console.log(`lockedBalance:    ${wallet.lockedBalance}`);
  console.log(`spendableBalance: ${wallet.spendableBalance}`);
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: node scripts/test-wallet-lock.js <userId>");
    process.exit(1);
  }

  await printWallet("Initial state", userId);

  console.log("\n>>> Crediting wallet with NGN 5,000 (simulated funding)...");
  await walletService.creditWallet({
    userId,
    amount: 5000,
    type: "CREDIT",
    reference: `TEST-CREDIT-${Date.now()}`,
    description: "Manual test credit",
  });
  await printWallet("After credit", userId);

  console.log("\n>>> Locking NGN 2,000 (simulating an order entering PROCESSING)...");
  await walletService.lockFunds({
    userId,
    amount: 2000,
    reference: `TEST-LOCK-${Date.now()}`,
  });
  await printWallet("After lock", userId);

  console.log("\n>>> Settling the locked NGN 2,000 as a successful debit...");
  await walletService.settleDebit({
    userId,
    amount: 2000,
    reference: `TEST-SETTLE-${Date.now()}`,
    description: "Manual test settlement",
  });
  await printWallet("After settle (SUCCESS path)", userId);

  console.log("\n>>> Locking another NGN 1,000, then releasing it (simulating a FAILED order)...");
  await walletService.lockFunds({
    userId,
    amount: 1000,
    reference: `TEST-LOCK-2-${Date.now()}`,
  });
  await printWallet("After second lock", userId);

  await walletService.releaseLock({
    userId,
    amount: 1000,
    reference: `TEST-RELEASE-${Date.now()}`,
    reason: "Manual test — simulated order failure",
  });
  await printWallet("After release (FAILED path)", userId);

  console.log("\n✅ Wallet lifecycle test complete.");
}

main()
  .catch((err) => {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
