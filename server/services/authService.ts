import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "talentbridge_access_secret_123";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "talentbridge_refresh_secret_456";

export function generateToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" }); // Short-lived access token
}

export function generateRefreshToken(payload: any) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" }); // Long-lived refresh token
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (e) {
    return null;
  }
}
