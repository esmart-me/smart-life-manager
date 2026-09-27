import fs from "fs";
import path from "path";
import crypto from "crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "receipts");

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function validateSafePath(relativePath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, relativePath);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Security violation: Path traversal detected");
  }
  return resolved;
}

/**
 * Saves a receipt file to secure, non-public user-scoped storage.
 */
export async function saveReceiptFile(
  userId: string,
  originalName: string,
  buffer: Buffer
): Promise<{ storageKey: string; size: number }> {
  const userDir = path.join(STORAGE_ROOT, userId);
  ensureDirectoryExists(userDir);

  const randomPrefix = crypto.randomBytes(12).toString("hex");
  const cleanName = sanitizeFileName(originalName);
  const diskFileName = `${randomPrefix}-${cleanName}`;
  const storageKey = `${userId}/${diskFileName}`;

  const destinationPath = validateSafePath(storageKey);
  await fs.promises.writeFile(destinationPath, buffer);

  return {
    storageKey,
    size: buffer.length,
  };
}

/**
 * Reads a receipt file from secure storage.
 */
export async function readReceiptFile(storageKey: string): Promise<Buffer | null> {
  try {
    const fullPath = validateSafePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return await fs.promises.readFile(fullPath);
  } catch (err) {
    console.error("[Receipt storage read error]:", err);
    return null;
  }
}

/**
 * Deletes a receipt file from secure storage.
 */
export async function deleteReceiptFile(storageKey: string): Promise<boolean> {
  try {
    const fullPath = validateSafePath(storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Receipt storage delete error]:", err);
    return false;
  }
}
