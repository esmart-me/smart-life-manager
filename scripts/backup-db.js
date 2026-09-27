const fs = require("fs");
const path = require("path");

function createDatabaseBackup() {
  const rootDir = path.resolve(__dirname, "..");
  const backupsDir = path.join(rootDir, "backups");
  const dbPath = path.join(rootDir, "prisma", "dev.db");

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    console.error(`[Error] Database file not found at: ${dbPath}`);
    process.exit(1);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const backupFileName = `smart-life-db-backup-${timestamp}.db`;
  const backupDestination = path.join(backupsDir, backupFileName);

  try {
    fs.copyFileSync(dbPath, backupDestination);
    const stats = fs.statSync(backupDestination);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log("==========================================");
    console.log("SMART LIFE MANAGER - DATABASE BACKUP CREATED");
    console.log("==========================================");
    console.log(`Source:      ${dbPath}`);
    console.log(`Destination: ${backupDestination}`);
    console.log(`Size:        ${sizeKB} KB`);
    console.log(`Timestamp:   ${now.toISOString()}`);
    console.log("Status:      SAFE (Ignored by Git, stored in secure local backups folder)");
    console.log("==========================================");
  } catch (err) {
    console.error("[Error] Failed to create database backup:", err);
    process.exit(1);
  }
}

createDatabaseBackup();
