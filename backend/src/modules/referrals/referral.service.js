const { Prisma } = require("@prisma/client");
const prisma = require("../../common/config/prisma");
const walletService = require("../wallets/wallet.service");
const { notificationQueue } = require("../../queues");
const logger = require("../../common/utils/logger");

const MIN_QUALIFYING_FUNDING = new Prisma.Decimal(2000);

/**
 * Called after a wallet credit has already committed — see webhook.service.js.
 * Deliberately isolated from the funding transaction: a bug in here must
 * never roll back or block the user's own successful wallet funding.
 */
async function checkAndRewardReferral({ userId, walletId, amount }) {
  const referral = await prisma.referral.findFirst({
    where: { referredUserId: userId, rewarded: false },
  });
  if (!referral) return; // not a referred user, or already rewarded

  const fundingAmount = new Prisma.Decimal(amount);
  if (fundingAmount.lt(MIN_QUALIFYING_FUNDING)) {
    logger.info(
      `Referral reward skipped for user ${userId} — funding ${amount} below the ₦2,000 threshold`
    );
    return;
  }

  // This runs AFTER the current credit has already been committed, so a
  // count of exactly 1 gateway-funded credit means this one was the first —
  // i.e. the referral's qualifying window. Bonus/admin credits don't count
  // toward this — only real gateway funding (reference prefix WALLET-).
  const priorCreditsCount = await prisma.walletTransaction.count({
    where: {
      walletId,
      transactionType: "CREDIT",
      status: "SUCCESS",
      reference: { startsWith: "WALLET-" },
    },
  });

  if (priorCreditsCount !== 1) {
    logger.info(`Referral reward skipped for user ${userId} — this was not their first funding`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: { rewarded: true, rewardedAt: new Date() },
    });

    await walletService.creditWallet(
      {
        userId: referral.referrerId,
        amount: referral.rewardAmount,
        type: "BONUS",
        reference: `REFERRAL-${referral.id}`,
        description: "Referral reward — referred user's first qualifying funding",
        metadata: { referralId: referral.id, referredUserId: userId },
      },
      tx
    );
  });

  await notificationQueue.add("referral-rewarded", {
    userId: referral.referrerId,
    channel: "IN_APP",
    title: "Referral Reward Earned!",
    body: `You earned ₦${referral.rewardAmount} for referring a friend who funded their wallet.`,
  });

  logger.info(
    `Referral reward of ₦${referral.rewardAmount} credited to ${referral.referrerId} for referring ${userId}`
  );
}

module.exports = { checkAndRewardReferral };
