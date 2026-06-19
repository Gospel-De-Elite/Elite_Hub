const { Prisma } = require("@prisma/client");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const walletService = require("./wallet.service");
const { notificationQueue } = require("../../queues");
const logger = require("../../common/utils/logger");

/**
 * Single, idempotent entry point for crediting a wallet from a confirmed
 * successful payment — used by BOTH the webhook worker and the manual
 * /fund/verify fallback, so a payment can never be credited twice no
 * matter which path reaches it first. Guarded by the unique constraint
 * on processed_webhooks.gateway_reference.
 */
async function creditFromGatewayConfirmation({ gateway, gatewayReference, amount }) {
  const result = await prisma.$transaction(async (tx) => {
    const alreadyProcessed = await tx.processedWebhook.findUnique({
      where: { gatewayReference },
    });
    if (alreadyProcessed) {
      return { idempotent: true };
    }

    const paymentTxn = await tx.paymentTransaction.findUnique({
      where: { gatewayReference },
    });
    if (!paymentTxn) {
      throw ApiError.notFound(`No payment_transactions row for reference ${gatewayReference}`);
    }

    if (paymentTxn.status === "SUCCESS") {
      await tx.processedWebhook.create({
        data: { gateway, gatewayReference, payload: { note: "late idempotency record" } },
      });
      return { idempotent: true };
    }

    await tx.paymentTransaction.update({
      where: { id: paymentTxn.id },
      data: { status: "SUCCESS" },
    });

    const credit = await walletService.creditWallet(
      {
        userId: paymentTxn.userId,
        amount: new Prisma.Decimal(amount),
        type: "CREDIT",
        reference: `WALLET-${gatewayReference}`,
        description: `Wallet funding via ${gateway}`,
        metadata: { gateway, gatewayReference },
      },
      tx
    );

    await tx.processedWebhook.create({
      data: {
        gateway,
        gatewayReference,
        payload: { amount: amount.toString(), gatewayReference },
      },
    });

    // TODO (Phase 5 — Referral Engine): if this is the referred user's first
    // SUCCESS funding and amount >= NGN 2,000, trigger the referrer's reward here.

    return { credited: true, credit, userId: paymentTxn.userId, amount };
  });

  if (result.credited) {
    await notificationQueue.add("wallet-funded", {
      userId: result.userId,
      channel: "IN_APP",
      title: "Wallet Funded",
      body: `Your wallet has been credited with NGN ${result.amount}.`,
    });
  }

  return result;
}

async function processPaystackEvent(event) {
  if (event.event !== "charge.success") {
    logger.info(`Ignored Paystack event type: ${event.event}`);
    return { skipped: true };
  }

  const { reference, amount } = event.data;
  const amountNaira = new Prisma.Decimal(amount).div(100);

  return creditFromGatewayConfirmation({
    gateway: "PAYSTACK",
    gatewayReference: reference,
    amount: amountNaira,
  });
}

async function processMonnifyEvent(event) {
  if (event.eventType && event.eventType !== "SUCCESSFUL_TRANSACTION") {
    logger.info(`Ignored Monnify event type: ${event.eventType}`);
    return { skipped: true };
  }

  const data = event.eventData || event;

  return creditFromGatewayConfirmation({
    gateway: "MONNIFY",
    gatewayReference: data.paymentReference,
    amount: data.amountPaid,
  });
}

module.exports = { creditFromGatewayConfirmation, processPaystackEvent, processMonnifyEvent };
