const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("../../common/config/prisma");
const env = require("../../common/config/env");
const walletService = require("../wallets/wallet.service");
const catalogCache = require("../pricing/catalog.cache");
const logAudit = require("../../common/utils/auditLogger");
const logger = require("../../common/utils/logger");

const anthropic = new Anthropic({ apiKey: env.anthropic.apiKey });

const MAX_TOOL_ROUNDS = 5; // hard cap so a confused tool-use loop can never run away
const HISTORY_LIMIT = 20; // messages of context fed back to Claude per turn

const SYSTEM_PROMPT = `You are the AI support assistant for Elite Hub, a Nigerian digital services platform by De Elite Digitals ("One Hub. Endless Connections."). You help customers with airtime, data, electricity, TV, SMS, and eSIM services.

Your job is Level 1 support: answer FAQs, check order status, check wallet status, and answer pricing questions using your tools. You escalate to a human agent via WhatsApp when you can't resolve something yourself.

FACTS ABOUT ELITE HUB:
- Users must fund their wallet (via Paystack or Monnify, minimum ₦100) before buying anything.
- Pricing depends on account tier: Customer, Reseller, and Agent each see different prices for the same product — Reseller and Agent get better rates. Use the get_product_pricing tool rather than guessing a price.
- If a purchase fails, the wallet is never actually charged — funds are only held temporarily during processing, then released on failure. Customers sometimes worry they were charged for a failed order; reassure them this isn't how it works here.
- Referral program: when someone you referred funds their wallet for the FIRST time with ₦2,000 or more, you earn a ₦100 bonus. Their first funding has to be at least ₦2,000 — if their first funding is smaller, that specific referral won't qualify.
- Role upgrades (Customer → Reseller or Agent) are requested from the Profile page and reviewed by an admin — they are not instant or self-service.
- eSIM: customers scan a QR code in their order details to activate. If a QR code was never delivered, the order auto-fails and the wallet is never charged. If a QR was delivered but the customer says it didn't activate, that's always a manual dispute reviewed by a human — you cannot resolve or approve refunds for this yourself; if asked, explain this and offer to escalate.
- SMS: every account has a default "EliteHub" sender ID that always works. Custom sender IDs can be requested from SMS > Sender IDs, but need both Elite Hub admin approval and carrier approval, which can take several days.

HOW TO BEHAVE:
- Be warm, concise, and direct. Avoid corporate fluff.
- Always use your tools to check real account data — never guess a balance, order status, or price.
- If a user asks about an order, ask for the order reference if they haven't given one, OR use list_recent_orders if they're vague ("my last order", "what did I just buy").
- Escalate to a human via the escalate_to_human tool when: the user explicitly asks for a human/agent, the issue is a dispute or refund decision, you've tried and can't resolve something after a couple of exchanges, or the user seems frustrated.
- When you escalate, tell the user clearly that you're connecting them to a human agent via WhatsApp, and that a link will appear for them to continue the conversation there.
- Never make up information about policies, prices, or order outcomes. If you don't know something and no tool can answer it, escalate rather than guess.`;

const TOOLS = [
  {
    name: "get_wallet_balance",
    description: "Get the current user's NGN wallet balance, locked balance, and spendable balance.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_order_status",
    description: "Look up the status of a specific order by its reference code (e.g. EH-ORD-xxxx).",
    input_schema: {
      type: "object",
      properties: { reference: { type: "string", description: "The order reference code" } },
      required: ["reference"],
    },
  },
  {
    name: "list_recent_orders",
    description:
      "List the current user's most recent orders (airtime, data, electricity, TV, SMS credit purchases).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many recent orders to return, default 5" } },
    },
  },
  {
    name: "get_product_pricing",
    description:
      "Look up current prices for a product category, resolved to the user's own role-based pricing tier.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["airtime", "data", "electricity", "cable-tv", "sms"] },
      },
      required: ["category"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Escalate this conversation to a human support agent via WhatsApp. Use this when the user explicitly asks for a human, when the issue is a dispute or refund decision you cannot make, or when you've been unable to resolve the issue after a reasonable attempt.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Brief reason for escalation, for the human agent's context" },
      },
      required: ["reason"],
    },
  },
];

function buildWhatsappLink(reason) {
  const text = encodeURIComponent(
    reason
      ? `Hi, I need help with my Elite Hub account. Issue: ${reason}`
      : "Hi, I need help with my Elite Hub account."
  );
  return `https://wa.me/${env.support.whatsappNumber}?text=${text}`;
}

async function executeTool(toolName, input, userId, userRole) {
  switch (toolName) {
    case "get_wallet_balance": {
      const wallet = await walletService.getWallet(userId);
      return {
        balance: wallet.balance.toString(),
        lockedBalance: wallet.lockedBalance.toString(),
        spendableBalance: wallet.spendableBalance.toString(),
      };
    }

    case "get_order_status": {
      // Scoped to userId — this tool can NEVER look up another user's order,
      // regardless of what reference Claude is asked to check.
      const order = await prisma.order.findFirst({ where: { reference: input.reference, userId } });
      if (!order) return { found: false, message: "No order found with that reference on this account." };
      return {
        found: true,
        orderType: order.orderType,
        status: order.status,
        amount: order.amount.toString(),
        createdAt: order.createdAt,
      };
    }

    case "list_recent_orders": {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: Math.min(input.limit || 5, 10),
      });
      return {
        orders: orders.map((o) => ({
          reference: o.reference,
          orderType: o.orderType,
          status: o.status,
          amount: o.amount.toString(),
          createdAt: o.createdAt,
        })),
      };
    }

    case "get_product_pricing": {
      const products = await prisma.product.findMany({
        where: { active: true, category: { slug: input.category } },
      });

      const results = [];
      for (const p of products) {
        const rule = await catalogCache.getSellingPrice(p.id, userRole);
        results.push({ name: p.name, price: rule ? rule.sellingPrice.toString() : null });
      }
      return { products: results };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Reuses the user's existing OPEN AI_CHAT conversation if one exists.
 * Explicitly does NOT reuse an ESCALATED or RESOLVED conversation even if
 * its id is passed in — once handed off to a human, a new message starts
 * a fresh AI thread rather than continuing inside the closed-out one.
 */
async function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const existing = await prisma.supportConversation.findFirst({ where: { id: conversationId, userId } });
    if (existing && existing.status === "OPEN") return existing;
  }

  const openConversation = await prisma.supportConversation.findFirst({
    where: { userId, source: "AI_CHAT", status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (openConversation) return openConversation;

  return prisma.supportConversation.create({
    data: { userId, source: "AI_CHAT", status: "OPEN" },
  });
}

async function getCurrentConversationWithMessages(userId) {
  const conversation = await prisma.supportConversation.findFirst({
    where: { userId, source: "AI_CHAT" },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    whatsappLink: conversation.status === "ESCALATED" ? buildWhatsappLink() : null,
  };
}

async function sendMessage({ userId, userRole, conversationId, message }) {
  const conversation = await getOrCreateConversation(userId, conversationId);

  await prisma.supportMessage.create({
    data: { conversationId: conversation.id, senderType: "USER", message },
  });

  const history = await prisma.supportMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });

  let messages = history.map((m) => ({
    role: m.senderType === "USER" ? "user" : "assistant",
    content: m.message,
  }));

  let escalated = false;
  let escalationReason = null;
  let finalText = "";

  try {
    // Tool-use loop: Claude may call a tool, we execute it ourselves
    // (never trusting Claude to fetch data directly), feed the result
    // back, and let it continue — looping until it returns plain text or
    // we hit the hard round cap.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: env.anthropic.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      const toolUseBlocks = response.content.filter((c) => c.type === "tool_use");

      if (toolUseBlocks.length === 0) {
        finalText = response.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of toolUseBlocks) {
        if (block.name === "escalate_to_human") {
          escalated = true;
          escalationReason = block.input.reason;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ escalated: true }),
          });
          continue;
        }

        const result = await executeTool(block.name, block.input, userId, userRole);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }

      messages.push({ role: "user", content: toolResults });

      if (escalated) {
        // One more turn so Claude can produce a proper closing message
        // acknowledging the handoff, then stop regardless of further tool calls.
        const closing = await anthropic.messages.create({
          model: env.anthropic.model,
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages,
        });
        finalText = closing.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        break;
      }
    }
  } catch (error) {
    logger.error(`AI support call failed: ${error.message}`);
    // Fail safe, not stuck: if Claude is unreachable, hand off to a human
    // rather than leaving the user staring at a broken chat widget.
    escalated = true;
    escalationReason = "AI assistant unavailable";
    finalText =
      "I'm having trouble connecting right now. Let me get you to a human agent on WhatsApp instead.";
  }

  await prisma.supportMessage.create({
    data: { conversationId: conversation.id, senderType: "AI", message: finalText },
  });

  if (escalated) {
    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: { status: "ESCALATED" },
    });

    await logAudit({
      actorId: userId,
      action: "SUPPORT_ESCALATED",
      entityType: "SupportConversation",
      entityId: conversation.id,
      newValue: { reason: escalationReason },
    });
  }

  return {
    conversationId: conversation.id,
    message: finalText,
    escalated,
    whatsappLink: escalated ? buildWhatsappLink(escalationReason) : null,
  };
}

module.exports = { sendMessage, getCurrentConversationWithMessages };
