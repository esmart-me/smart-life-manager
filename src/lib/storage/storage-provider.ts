import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StoredFileMeta {
  storageKey: string;
  storageDriver: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export interface IStorageProvider {
  store(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<StoredFileMeta>;
  retrieve(userId: string, storageKey: string): Promise<Buffer>;
  remove(userId: string, storageKey: string): Promise<boolean>;
}

/**
 * Local secure storage provider.
 * Keeps uploaded private files OUTSIDE the public web directory.
 * Path traversal checks guarantee users can only access files within their own folder.
 */
class LocalSecureStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_PATH || "./storage/private");
  }

  private sanitizeUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9_-]/g, "");
  }

  private getUserDir(userId: string): string {
    const safeUserId = this.sanitizeUserId(userId);
    return path.join(this.baseDir, safeUserId);
  }

  async store(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<StoredFileMeta> {
    const userDir = this.getUserDir(userId);
    await fs.mkdir(userDir, { recursive: true });

    // Generate unique content hash and non-guessable storage key
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const fileExt = path.extname(originalFilename).slice(0, 10);
    const uniqueId = crypto.randomUUID();
    const storageKey = `${uniqueId}${fileExt}`;

    const destination = path.join(userDir, storageKey);

    // Write file securely
    await fs.writeFile(destination, fileBuffer);

    return {
      storageKey,
      storageDriver: "local",
      fileName: path.basename(originalFilename),
      fileSize: fileBuffer.length,
      mimeType,
      checksum,
    };
  }

  async retrieve(userId: string, storageKey: string): Promise<Buffer> {
    const userDir = this.getUserDir(userId);
    const safeKey = path.basename(storageKey);
    const filePath = path.join(userDir, safeKey);

    // Prevent directory traversal
    if (!filePath.startsWith(userDir)) {
      throw new Error("Access denied: Invalid file path traversal detected");
    }

    return fs.readFile(filePath);
  }

  async remove(userId: string, storageKey: string): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const safeKey = path.basename(storageKey);
      const filePath = path.join(userDir, safeKey);

      if (!filePath.startsWith(userDir)) {
        throw new Error("Access denied: Invalid file path traversal detected");
      }

      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton storage provider export
export const secureStorage = new LocalSecureStorageProvider();
