const prisma = require("../config/prisma");
const logger = require("./logger");

/**
 * Writes a row to the immutable audit_logs table.
 * Call this for every sensitive action: role changes, pricing changes,
 * wallet overrides, admin actions, account creation, etc.
 *
 * This must never throw — a failed audit write should never block or
 * crash the action it's trying to record.
 */
async function logAudit({
  actorId,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error(`Audit log write failed: ${error.message}`);
  }
}

module.exports = logAudit;
