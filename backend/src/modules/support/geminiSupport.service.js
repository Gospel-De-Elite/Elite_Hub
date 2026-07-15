/**
 * Gemini Fallback Support Service
 *
 * Strategy: context injection instead of tool-use.
 *
 * Anthropic's tool-use loop is the primary path. If that fails, we drop
 * into this module which:
 *   1. Pre-fetches the user's wallet balance and recent orders ourselves
 *      (so Gemini never needs to call any tools — we just hand it the data)
 *   2. Injects that context into a rich system prompt
 *   3. Calls Gemini 1.5 Flash for a single conversational response
 *
 * This is simpler, more reliable across providers (no tool-schema porting),
 * and still gives the user a genuinely useful answer with real account data.
 * The trade-off is that Gemini can't look up a specific order by reference
 * in this mode — but for an emergency fallback that's an acceptable limit.
 *
 * If GEMINI_API_KEY is not set, this module exports a no-op that returns
 * null, and aiSupport.service.js falls straight through to WhatsApp
 * escalation — so the key is strictly optional.
 */

const prisma  = require("../../common/config/prisma");
const env     = require("../../common/config/env");
const logger  = require("../../common/utils/logger");

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function buildSystemPrompt(walletCtx, ordersCtx) {
  return `You are the AI support assistant for Elite Hub, a Nigerian digital services platform by De Elite Digitals ("One Hub. Endless Connections.").

PLATFORM FACTS:
- Users fund a wallet (via Paystack or Monnify, minimum ₦100) before buying anything.
- Pricing depends on account tier: Customer, Reseller, Agent — Resellers and Agents get better rates.
- If a purchase fails, the wallet is never actually charged — funds are only held temporarily then released.
- Referral bonus: ₦100 when a referred user makes their FIRST wallet funding of at least ₦2,000.
- Role upgrades are requested from the Profile page and reviewed by an admin — not instant.
- eSIM: customers scan a QR code to activate. QR not delivered = auto-refund. QR delivered but not working = manual dispute.
- SMS: default "EliteHub" sender ID always works. Custom sender IDs need admin + carrier approval (several days).

CURRENT USER ACCOUNT DATA (live, fetched at request time):
${walletCtx}
${ordersCtx}

BEHAVIOUR:
- Be warm, concise, and direct. No corporate fluff.
- Use the account data above to answer balance and recent order questions.
- If the user asks about a specific order reference you don't have in the data above, tell them you can see their recent orders but ask them to provide the reference for a more specific lookup, or suggest they check their order history in the app.
- If the issue involves a refund decision, dispute, or something you genuinely can't resolve, tell the user a human agent will follow up via WhatsApp.
- Never invent balances, prices, or order outcomes not shown in the data above.`;
}

async function fetchUserContext(userId) {
  try {
    const [wallet, orders] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const walletCtx = wallet
      ? `Wallet balance: ₦${Number(wallet.balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })} | Locked: ₦${Number(wallet.lockedBalance).toLocaleString("en-NG", { minimumFractionDigits: 2 })} | Spendable: ₦${Number(wallet.balance - wallet.lockedBalance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
      : "Wallet: not found";

    const ordersCtx =
      orders.length === 0
        ? "Recent orders: none"
        : "Recent orders:\n" +
          orders
            .map(
              (o) =>
                `  - ${o.reference} | ${o.orderType} | ${o.status} | ₦${Number(o.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })} | ${new Date(o.createdAt).toLocaleDateString("en-NG")}`
            )
            .join("\n");

    return { walletCtx, ordersCtx };
  } catch (err) {
    logger.warn(`Gemini fallback: failed to fetch user context for ${userId}: ${err.message}`);
    return {
      walletCtx:  "Wallet: unavailable",
      ordersCtx:  "Recent orders: unavailable",
    };
  }
}

/**
 * Calls Gemini directly via the REST API rather than pulling in the
 * `@google/generative-ai` npm package — keeps dependencies lighter and
 * avoids adding a package that's only used in the fallback path.
 * Node 18+ has native fetch so no extra dependency is needed.
 */
async function callGemini(systemPrompt, conversationHistory, userMessage) {
  const apiKey = env.gemini.apiKey;
  const model  = env.gemini.model;

  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

  // Gemini doesn't have a separate system role — prepend the system prompt
  // as the first user turn in a "conversation" that starts from the AI's
  // perspective (user says the system prompt context, model says "OK").
  const contents = [
    { role: "user",  parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I'm ready to help Elite Hub customers." }] },
    // Replay prior conversation history so Gemini has context
    ...conversationHistory.map((m) => ({
      role:  m.senderType === "USER" ? "user" : "model",
      parts: [{ text: m.message }],
    })),
    // The new user message
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      contents,
      generationConfig: {
        temperature:     0.4,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Gemini returned an empty response");

  return text.trim();
}

/**
 * Entry point called by aiSupport.service.js when Anthropic fails.
 * Returns null if GEMINI_API_KEY is not configured — caller falls
 * through to WhatsApp escalation in that case.
 */
async function tryGeminiFallback({ userId, message, conversationHistory }) {
  if (!env.gemini.apiKey) {
    logger.info("Gemini fallback skipped — GEMINI_API_KEY not configured");
    return null;
  }

  try {
    logger.info(`Attempting Gemini fallback for user ${userId}`);

    const { walletCtx, ordersCtx } = await fetchUserContext(userId);
    const systemPrompt = buildSystemPrompt(walletCtx, ordersCtx);
    const reply = await callGemini(systemPrompt, conversationHistory, message);

    logger.info(`Gemini fallback succeeded for user ${userId}`);
    return reply;
  } catch (err) {
    logger.error(`Gemini fallback failed for user ${userId}: ${err.message}`);
    return null;
  }
}

module.exports = { tryGeminiFallback };
