const { verifyAccessToken } = require("../utils/jwt");
const ApiError = require("../errors/ApiError");
const prisma = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }

    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!user) throw ApiError.unauthorized("User no longer exists");
    if (user.status !== "ACTIVE") throw ApiError.forbidden("Account is not active");

    // Minimal, safe payload attached to every downstream request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Access token expired"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(ApiError.unauthorized("Invalid access token"));
    }
    next(error);
  }
};

module.exports = authenticate;
