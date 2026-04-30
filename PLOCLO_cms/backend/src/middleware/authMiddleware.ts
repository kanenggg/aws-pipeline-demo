import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

// บังคับว่า JWT_SECRET เป็น string
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    // If request is from browser, redirect to main page
    if (req.accepts("html")) {
      return res.redirect("/");
    }
    return res.status(401).json({ error: "Access denied" });
  }

  // token แน่ใจแล้วว่าไม่ undefined
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // If request is from browser, redirect to main page
      if (req.accepts("html")) {
        return res.redirect("/");
      }
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}
