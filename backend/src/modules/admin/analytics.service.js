const prisma = require("../../common/config/prisma");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

async function getOverview() {
  const [
    usersByRoleRaw,
    roles,
    walletTotals,
    ordersToday,
    ordersThisWeek,
    failedOrdersThisWeek,
    revenueAgg,
    referralStats,
    totalCampaigns,
    totalMessagesSent,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["roleId"], _count: { _all: true } }),
    prisma.role.findMany(),
    prisma.wallet.aggregate({ _sum: { balance: true, lockedBalance: true } }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday() } } }),
    prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo() } } }),
    prisma.order.count({ where: { status: "FAILED", createdAt: { gte: sevenDaysAgo() } } }),
    prisma.order.aggregate({ where: { status: "SUCCESS" }, _sum: { profitSnapshot: true, amount: true } }),
    prisma.referral.aggregate({ where: { rewarded: true }, _count: { _all: true }, _sum: { rewardAmount: true } }),
    prisma.smsCampaign.count(),
    prisma.smsMessage.count({ where: { deliveryStatus: "SENT" } }),
  ]);

  const roleNameById = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const usersByRole = Object.fromEntries(
    usersByRoleRaw.map((r) => [roleNameById[r.roleId], r._count._all])
  );

  return {
    usersByRole,
    wallets: {
      totalBalance: walletTotals._sum.balance || 0,
      totalLocked: walletTotals._sum.lockedBalance || 0,
    },
    orders: {
      today: ordersToday,
      last7Days: ordersThisWeek,
      failedLast7Days: failedOrdersThisWeek,
    },
    revenue: {
      totalProfit: revenueAgg._sum.profitSnapshot || 0,
      totalTransacted: revenueAgg._sum.amount || 0,
    },
    referrals: {
      totalRewarded: referralStats._count._all,
      totalPaidOut: referralStats._sum.rewardAmount || 0,
    },
    sms: {
      totalCampaigns,
      totalMessagesSent,
    },
  };
}

module.exports = { getOverview };
