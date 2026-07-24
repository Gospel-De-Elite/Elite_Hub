const catchAsync = require("../../common/utils/catchAsync");
const prisma = require("../../common/config/prisma");

/**
 * GET /api/v1/referrals
 * Returns the authenticated user's referral stats and list of referred users.
 */
const getReferralStats = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const [user, referrals, aggregate] = await Promise.all([
    // fetch the current user's referral code
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),

    // fetch all referrals made by this user with referred user details
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        referredUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    }),

    // total earnings from rewarded referrals
    prisma.referral.aggregate({
      where: { referrerId: userId, rewarded: true },
      _sum: { rewardAmount: true },
      _count: { _all: true },
    }),
  ]);

  const referralLink = user?.referralCode
    ? `${process.env.FRONTEND_URL || "https://elitehub.ng"}/register?ref=${user.referralCode}`
    : null;

  res.status(200).json({
    success: true,
    data: {
      referralCode: user?.referralCode ?? null,
      referralLink,
      totalEarnings: aggregate._sum.rewardAmount ?? 0,
      totalReferrals: referrals.length,
      rewardedReferrals: aggregate._count._all,
      pendingReferrals: referrals.length - aggregate._count._all,
      referrals: referrals.map((r) => ({
        id: r.id,
        name: `${r.referredUser.firstName} ${r.referredUser.lastName}`,
        email: r.referredUser.email,
        joinedAt: r.createdAt,
        rewarded: r.rewarded,
        rewardedAt: r.rewardedAt,
        rewardAmount: r.rewardAmount,
      })),
    },
  });
});

module.exports = { getReferralStats };
