const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");

async function listAuditLogs({ page = 1, limit = 50, actorId, entityType, action, from, to } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    ...(actorId ? { actorId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getAuditLog(id) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!log) throw ApiError.notFound("Audit log entry not found");
  return log;
}

module.exports = { listAuditLogs, getAuditLog };
