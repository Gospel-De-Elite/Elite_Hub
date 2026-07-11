"use strict";

/**
 * Passport Google OAuth 2.0 strategy.
 *
 * This file configures the strategy and exports the two route handlers
 * (redirect + callback) as plain Express middleware arrays so we don't
 * need to call passport.initialize() globally — we only need it on the
 * two auth/google routes, which avoids polluting session state across the
 * whole app (the rest of the platform is stateless JWT).
 */

const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env            = require("../../common/config/env");
const authService    = require("./auth.service");
const logger         = require("../../common/utils/logger");

passport.use(
  new GoogleStrategy(
    {
      clientID:     env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL:  env.google.callbackUrl,
      // Ask Google for the minimal necessary scopes.
      scope:        ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const emails    = profile.emails || [];
        const email     = emails[0]?.value;
        const firstName = profile.name?.givenName  || profile.displayName || "User";
        const lastName  = profile.name?.familyName || "";
        const picture   = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error("Google account did not provide an email address"), null);
        }

        const user = await authService.findOrCreateGoogleUser({
          googleId: profile.id,
          email,
          firstName,
          lastName,
          picture,
        });

        done(null, user);
      } catch (err) {
        logger.error(`[google.strategy] OAuth error: ${err.message}`);
        done(err, null);
      }
    }
  )
);

// We don't use Passport sessions — JWT is the session mechanism.
// These stubs satisfy Passport's internal requirement.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

module.exports = passport;
