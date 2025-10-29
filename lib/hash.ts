import crypto from "crypto";
export const stableHash = (s: string) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);
