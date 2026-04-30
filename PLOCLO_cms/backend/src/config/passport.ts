import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.log("CHECK ENV:", {
  id: process.env.GOOGLE_CLIENT_ID ? "OK" : "MISSING",
  secret: process.env.GOOGLE_CLIENT_SECRET ? "OK" : "MISSING",
  callback: process.env.GOOGLE_CALLBACK_URL, // ดูว่าค่านี้ออกมาเป็น URL หรือ undefined
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Logic สำหรับค้นหาหรือสร้าง User เท่านั้น
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error("No email"), undefined);

        const user = await prisma.users.upsert({
          where: { email: email },
          update: {},
          create: {
            username: profile.displayName,
            email: email,
            role: "student",
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);
