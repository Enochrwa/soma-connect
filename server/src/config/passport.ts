import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import { nanoid } from "nanoid";
import { env } from "./env.js";
import { User } from "../models/User.js";

// Google OAuth is only registered when credentials are configured.
export const googleOAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

if (googleOAuthEnabled) {
  const verify = async (
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) => {
    try {
      console.log("Passport verify: Starting Google profile processing", {
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
      });

      if (!profile.id) {
        console.error("Passport verify: Google profile missing ID");
        return done(new Error("Google profile is missing ID"));
      }

      const email = profile.emails?.[0]?.value;
      const avatar = profile.photos?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || "SOMA User";

      console.log("Passport verify: Profile data extracted", { email, name, avatar: !!avatar });

      // 1. Match by googleId first
      let user = await User.findOne({ googleId: profile.id });
      console.log("Passport verify: Search by googleId result", { found: !!user });

      // 2. Check for existing account by email - require explicit linking (don't silently link)
      if (!user && email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          console.log("Passport verify: Found existing user by email", {
            userId: String(existingUser._id),
            hasGoogleId: !!existingUser.googleId,
          });

          // If they already have a Google ID, they should use that
          if (existingUser.googleId) {
            console.log("Passport verify: User already has Google linked");
            return done(null, existingUser);
          }

          // If email exists but no Google ID, require explicit linking
          // Add flag to callback route so we can ask user to confirm
          existingUser.newlyLinkedGoogle = true;
          user = existingUser;
        }
      }

      // 3. Otherwise create a brand-new account
      if (!user) {
        console.log("Passport verify: Creating new user account from Google");
        user = await User.create({
          // Users created via Google may not have a Rwandan phone number yet.
          // Generate a unique placeholder that won't collide with real numbers.
          phone: `+250 7${nanoid(8).replace(/[^0-9]/g, "0")}`,
          email,
          googleId: profile.id,
          emailVerifiedAt: email ? new Date() : undefined,
          profile: { name, avatar, language: "en" },
          referralCode: nanoid(8).toUpperCase(),
        });
        console.log("Passport verify: New user created", { userId: String(user._id), email });
      }

      console.log("Passport verify: Success, calling done()", { userId: String(user._id) });
      done(null, user);
    } catch (err) {
      console.error("Passport verify: Error in Google strategy", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      done(err as Error);
    }
  };

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      verify,
    ),
  );
}

export { passport };
