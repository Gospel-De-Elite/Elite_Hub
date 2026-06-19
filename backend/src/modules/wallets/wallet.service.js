const { Prisma } = require("@prisma/client");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");

/**
 * Row-locks a wallet for the duration of the enclosing transaction.
 * Must always be called inside prisma.$transaction(async (tx) => {...}),
 * passing that same `tx` in — never the top-level prisma client. This is
 * what makes two simultaneous purchase requests against the same wallet
 * serialize instead of racing each other.
 */
async function lockWalletRow(tx, userId) {
  const rows = await tx.$queryRaw`
    SELECT id, balance, locked_balance AS "lockedBalance"
    FROM wallets
    WHERE user_id = ${userId}::uuid
    FOR UPDATE
  `;

  if (!rows.length) {
    throw ApiError.notFound("Wallet not found");
  }

  const row = rows[0];
  return {
    id: row.id,
    balance: new Prisma.Decimal(row.balance),
    lockedBalance: new Prisma.Decimal(row.lockedBalance),
  };
}

async function getWallet(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw ApiError.notFound("Wallet not found");

  return {
    ...wallet,
    spendableBalance: wallet.balance.minus(wallet.lockedBalance),
  };
}

async function getTransactionHistory(userId, { page = 1, limit = 20 } = {}) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw ApiError.notFound("Wallet not found");

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Credits a wallet — used for funding (CREDIT), referral payouts (BONUS),
 * and refunds (REFUND). Pass an existing `tx` to run as part of a larger
 * transaction (e.g. from the webhook handler); omit it to run standalone.
 */
async function creditWallet(
  { userId, amount, type = "CREDIT", reference, description, metadata },
  externalTx = null
) {
  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lte(0)) {
    throw ApiError.badRequest("Credit amount must be greater than zero");
  }

  const run = async (tx) => {
    const wallet = await lockWalletRow(tx, userId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.plus(amountDecimal);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: type,
        amount: amountDecimal,
        balanceBefore,
        balanceAfter,
        reference,
        status: "SUCCESS",
        description,
        metadata,
      },
    });

    return { balanceBefore, balanceAfter, transaction };
  };

  if (externalTx) return run(externalTx);
  return prisma.$transaction(run);
}

// Convenience wrapper — semantically a refund, mechanically identical to a credit.
async function refundWallet(params, externalTx = null) {
  return creditWallet({ ...params, type: "REFUND" }, externalTx);
}

/**
 * Reserves funds against the wallet for an order entering PROCESSING.
 * Moves nothing out of `balance` — only raises `lockedBalance`, which is
 * subtracted from `balance` to compute spendable funds (balance - locked).
 * The row lock + spendable check happen atomically together, so the same
 * naira can never be reserved twice by two orders racing each other.
 */
async function lockFunds({ userId, amount, reference }) {
  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lte(0)) {
    throw ApiError.badRequest("Lock amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await lockWalletRow(tx, userId);
    const spendable = wallet.balance.minus(wallet.lockedBalance);

    if (spendable.lt(amountDecimal)) {
      throw ApiError.badRequest("Insufficient wallet balance");
    }

    const newLockedBalance = wallet.lockedBalance.plus(amountDecimal);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { lockedBalance: newLockedBalance },
    });

    return { walletId: wallet.id, lockedBalance: newLockedBalance, reference };
  });
}

/**
 * Releases a hold without ever having committed a debit — used when an
 * order in PROCESSING ends in FAILED. Balance is untouched because it was
 * never actually deducted; only the reservation is undone. Writes a
 * FAILED-status ledger row purely for traceability/support visibility —
 * no real money moved, but support staff can still see the held-then-
 * released amount against this reference.
 */
async function releaseLock({ userId, amount, reference, reason }) {
  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lte(0)) {
    throw ApiError.badRequest("Release amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await lockWalletRow(tx, userId);
    const newLockedBalance = wallet.lockedBalance.minus(amountDecimal);

    if (newLockedBalance.lt(0)) {
      throw ApiError.conflict("Release amount exceeds currently locked balance");
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { lockedBalance: newLockedBalance },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: "DEBIT",
        amount: amountDecimal,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        reference,
        status: "FAILED",
        description: reason || "Lock released — order did not settle",
      },
    });

    return { lockedBalance: newLockedBalance, transaction };
  });
}

/**
 * Converts a hold into a final, committed debit — used when an order in
 * PROCESSING ends in SUCCESS. This is the only point where `balance`
 * actually decreases for a purchase, and the only point a real DEBIT
 * ledger row is written for it.
 */
async function settleDebit({ userId, amount, reference, description, metadata }) {
  const amountDecimal = new Prisma.Decimal(amount);
  if (amountDecimal.lte(0)) {
    throw ApiError.badRequest("Settlement amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await lockWalletRow(tx, userId);

    if (wallet.lockedBalance.lt(amountDecimal)) {
      throw ApiError.conflict("Settlement amount exceeds locked balance — lock/settle mismatch");
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.minus(amountDecimal);
    const newLockedBalance = wallet.lockedBalance.minus(amountDecimal);

    if (balanceAfter.lt(0)) {
      throw ApiError.conflict("Settlement would drive wallet balance negative");
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter, lockedBalance: newLockedBalance },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: "DEBIT",
        amount: amountDecimal,
        balanceBefore,
        balanceAfter,
        reference,
        status: "SUCCESS",
        description,
        metadata,
      },
    });

    return { balanceBefore, balanceAfter, transaction };
  });
}

module.exports = {
  getWallet,
  getTransactionHistory,
  creditWallet,
  refundWallet,
  lockFunds,
  releaseLock,
  settleDebit,
};
