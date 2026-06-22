const prisma = require("../../common/config/prisma");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Backs the Dashboard Home screen's summary cards, quick actions context,
 * activity feed, and referral widget — all in one round trip rather than
 * several incomplete client-side computations across existing endpoints.
 */
async function getSummary(userId) {
  const [wallet, todayTransactionCount, totalTransactionCount, referralAgg, recentOrders, recentNotifications] =
    await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.order.count({ where: { userId, createdAt: { gte: startOfToday() } } }),
      prisma.order.count({ where: { userId } }),
      prisma.referral.aggregate({
        where: { referrerId: userId, rewarded: true },
        _sum: { rewardAmount: true },
        _count: { _all: true },
      }),
      prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return {
    wallet: wallet
      ? {
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          spendableBalance: wallet.balance.minus(wallet.lockedBalance),
        }
      : null,
    todayTransactionCount,
    totalTransactionCount,
    referralEarnings: referralAgg._sum.rewardAmount || 0,
    successfulReferralCount: referralAgg._count._all,
    recentOrders,
    recentNotifications,
  };
}

module.exports = { getSummary };
