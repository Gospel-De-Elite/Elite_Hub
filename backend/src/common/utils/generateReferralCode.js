const crypto = require("crypto");
const prisma = require("../config/prisma");

// Generates a referral code like "GOS4F2A1B" — first 3 letters of the
// user's first name + a random hex suffix. Retries on collision.
async function generateReferralCode(firstName = "") {
  const prefix = firstName.slice(0, 3).toUpperCase().padEnd(3, "X");

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `${prefix}${suffix}`;

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    });

    if (!existing) return code;
  }

  throw new Error("Failed to generate a unique referral code after 5 attempts");
}

module.exports = generateReferralCode;
