const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");

async function listEscalated() {
  return prisma.supportConversation.findMany({
    where: { status: "ESCALATED" },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getConversation(id) {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) throw ApiError.notFound("Conversation not found");
  return conversation;
}

async function markResolved(id) {
  const conversation = await prisma.supportConversation.findUnique({ where: { id } });
  if (!conversation) throw ApiError.notFound("Conversation not found");

  return prisma.supportConversation.update({ where: { id }, data: { status: "RESOLVED" } });
}

module.exports = { listEscalated, getConversation, markResolved };
