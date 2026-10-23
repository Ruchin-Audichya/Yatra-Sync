import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export const tokenHash = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export const demoEnabled = () =>
  process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const assert = (
  condition: unknown,
  message: string,
  status = 400,
): asserts condition => {
  if (!condition) throw new AppError(message, status);
};
const limits = new Map<string, { at: number; count: number }>();
export function rateLimit(key: string, limit = 60, period = 60000) {
  const now = Date.now();
  let b = limits.get(key);
  if (!b || now - b.at > period) {
    b = { at: now, count: 0 };
    limits.set(key, b);
  }
  b.count++;
  if (b.count > limit)
    throw new AppError("Too many attempts. Please wait a minute.", 429);
  if (limits.size > 10000)
    for (const [k, v] of limits) if (now - v.at > period) limits.delete(k);
}
