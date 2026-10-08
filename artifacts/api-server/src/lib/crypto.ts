import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Encryption key ───────────────────────────────────────────────────────────
// Priority: ENCRYPTION_KEY env var → .server.key file → hard-fail
function loadKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) return Buffer.from(envKey, "hex");

  try {
    const keyFile = join(__dirname, "../../.server.key");
    const hex = readFileSync(keyFile, "utf8").trim();
    if (hex.length === 64) return Buffer.from(hex, "hex");
  } catch {}

  throw new Error("[CRYPTO] No valid encryption key found. Set ENCRYPTION_KEY env var (64 hex chars) or ensure .server.key file exists.");
}

let _key: Buffer | null = null;
function getKey(): Buffer {
  if (!_key) _key = loadKey();
  return _key;
}

// ─── Format: enc:v1:<hex-iv>.<hex-authTag>.<hex-ciphertext> ──────────────────
const PREFIX = "enc:v1:";

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  // Already encrypted — skip
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const key = getKey();
  const iv = randomBytes(12);                        // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  // Not encrypted (legacy plaintext) — return as-is
  if (!ciphertext.startsWith(PREFIX)) return ciphertext;

  const key = getKey();
  const payload = ciphertext.slice(PREFIX.length);
  const [ivHex, authTagHex, encHex] = payload.split(".");

  if (!ivHex || !authTagHex || !encHex) throw new Error("[CRYPTO] Malformed encrypted value");

  const iv      = Buffer.from(ivHex,      "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const enc     = Buffer.from(encHex,     "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}
