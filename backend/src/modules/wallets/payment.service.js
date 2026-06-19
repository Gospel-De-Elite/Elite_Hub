const { v4: uuidv4 } = require("uuid");
const { Prisma } = require("@prisma/client");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const paystackClient = require("./providers/paystack.client");
const monnifyClient = require("./providers/monnify.client");
const webhookService = require("./webhook.service");

const MIN_FUNDING_AMOUNT = 100; // NGN — floor to avoid pointless gateway fee ratios

function generatePaymentReference() {
  return `EH-FUND-${uuidv4()}`;
}

async function initializeFunding({ userId, amount, gateway }) {
  if (Number(amount) < MIN_FUNDING_AMOUNT) {
    throw ApiError.badRequest(`Minimum funding amount is NGN ${MIN_FUNDING_AMOUNT}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const reference = generatePaymentReference();

  await prisma.paymentTransaction.create({
    data: {
      userId,
      gateway,
      gatewayReference: reference,
      amount,
      status: "PENDING",
    },
  });

  if (gateway === "PAYSTACK") {
    const result = await paystackClient.initializeTransaction({
      email: user.email,
      amount,
      reference,
    });
    return { reference, authorizationUrl: result.data.authorization_url };
  }

  if (gateway === "MONNIFY") {
    const result = await monnifyClient.initializeTransaction({
      amount,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      paymentReference: reference,
    });
    return { reference, checkoutUrl: result.responseBody.checkoutUrl };
  }

  throw ApiError.badRequest("Unsupported payment gateway");
}

/**
 * Frontend redirect-callback fallback. The webhook is the primary source
 * of truth for crediting; this exists so a user landing back on the app
 * gets an immediate status even if the webhook is delayed, and as a
 * backstop if it's lost entirely. Both paths funnel through the same
 * idempotent creditFromGatewayConfirmation, so this can never double-credit
 * even if the webhook fires moments later.
 */
async function verifyFunding({ reference }) {
  const paymentTxn = await prisma.paymentTransaction.findUnique({
    where: { gatewayReference: reference },
  });
  if (!paymentTxn) throw ApiError.notFound("Payment reference not found");

  if (paymentTxn.status === "SUCCESS") {
    return { status: "SUCCESS", message: "Payment already verified and credited" };
  }

  if (paymentTxn.gateway === "PAYSTACK") {
    const result = await paystackClient.verifyTransaction(reference);
    if (result.data.status !== "success") {
      return { status: "FAILED", message: "Payment was not successful" };
    }

    const amountNaira = new Prisma.Decimal(result.data.amount).div(100);
    await webhookService.creditFromGatewayConfirmation({
      gateway: "PAYSTACK",
      gatewayReference: reference,
      amount: amountNaira,
    });
  } else if (paymentTxn.gateway === "MONNIFY") {
    const result = await monnifyClient.queryTransaction(reference);
    if (result.responseBody.paymentStatus !== "PAID") {
      return { status: "FAILED", message: "Payment was not successful" };
    }

    await webhookService.creditFromGatewayConfirmation({
      gateway: "MONNIFY",
      gatewayReference: reference,
      amount: result.responseBody.amountPaid,
    });
  } else {
    throw ApiError.badRequest("Unsupported payment gateway");
  }

  return { status: "SUCCESS", message: "Payment verified and wallet credited" };
}

module.exports = { initializeFunding, verifyFunding, generatePaymentReference };
