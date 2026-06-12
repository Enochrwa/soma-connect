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
      const email = profile.emails?.[0]?.value;
      const avatar = profile.photos?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || "SOMA User";

      // 1. Match by googleId first
      let user = await User.findOne({ googleId: profile.id });

      // 2. Fall back to matching an existing account by email and link it
      if (!user && email) {
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
          if (avatar && !user.profile?.avatar) {
            user.profile = {
              ...(user.profile ?? {}),
              avatar,
              language: user.profile?.language ?? "en",
            };
          }
          await user.save();
        }
      }

      // 3. Otherwise create a brand-new account
      if (!user) {
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
      }

      done(null, user);
    } catch (err) {
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
