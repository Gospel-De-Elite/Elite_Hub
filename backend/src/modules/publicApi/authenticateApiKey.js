const bcrypt = require("bcryptjs");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");

// Wire format: Authorization: Bearer {apiKey}.{apiSecret}
// `apiKey` is a plaintext lookup identifier (like a username); `apiSecret`
// is the real credential and only its bcrypt hash is ever stored.
async function authenticateApiKey(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }

    const token = header.slice(7);
    const separatorIndex = token.indexOf(".");
    if (separatorIndex === -1) {
      throw ApiError.unauthorized(
        "Malformed API credentials — expected format: Bearer <apiKey>.<apiSecret>"
      );
    }

    const apiKeyValue = token.slice(0, separatorIndex);
    const apiSecret = token.slice(separatorIndex + 1);

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { apiKey: apiKeyValue },
      include: { user: { include: { role: true } } },
    });

    if (!apiKeyRecord || apiKeyRecord.status !== "ACTIVE") {
      throw ApiError.unauthorized("Invalid or revoked API key");
    }

    const secretMatches = await bcrypt.compare(apiSecret, apiKeyRecord.apiSecretHash);
    if (!secretMatches) {
      throw ApiError.unauthorized("Invalid API credentials");
    }

    if (apiKeyRecord.user.status !== "ACTIVE") {
      throw ApiError.forbidden("Account is not active");
    }

    req.user = {
      id: apiKeyRecord.user.id,
      email: apiKeyRecord.user.email,
      role: apiKeyRecord.user.role.name,
    };
    req.apiKeyId = apiKeyRecord.id;

    // Fire-and-forget — tracking last-used activity should never slow down the request.
    prisma.apiKey
      .update({ where: { id: apiKeyRecord.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticateApiKey;
