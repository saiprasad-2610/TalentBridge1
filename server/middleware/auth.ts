import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import crypto from "crypto";

// Generate a random, cryptographically strong secret at runtime if none is provided.
// This prevents offline brute-forcing of default/symmetric secret keys.
const generateSecureSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== "talentbridge_access_secret_123") {
    return process.env.JWT_SECRET;
  }
  console.warn("⚠️ Warning: No secure JWT_SECRET environment variable detected. Generating unique, high-entropy runtime secret to defend against symmetric signature brute-forcing.");
  return crypto.randomBytes(64).toString("hex");
};

const JWT_SECRET = generateSecureSecret();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: Insufficient permissions" });
    }
    next();
  };
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied: Admin only" });
  }
  next();
};
