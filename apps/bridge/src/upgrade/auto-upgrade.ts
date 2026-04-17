/**
 * D10: Auto-upgrader — checks for and applies updates automatically.
 */
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { logger as rootLogger } from '../logger.js';

const logger = rootLogger.child({ component: 'auto-upgrade' });

export interface UpdateInfo {
  version: string;
  url: string;
  checksum?: string;
  releaseNotes?: string;
}

export interface AutoUpgraderOptions {
  currentVersion: string;
  apiBaseUrl: string;
  apiToken: string;
  bridgeId: string;
  factoryId: string;
  dataDir: string;
}

export class AutoUpgrader {
  private currentVersion: string;
  private apiBaseUrl: string;
  private apiToken: string;
  private bridgeId: string;
  private factoryId: string;
  private dataDir: string;
  private backupDir: string;
  private checkScheduled = false;

  constructor(options: AutoUpgraderOptions) {
    this.currentVersion = options.currentVersion;
    this.apiBaseUrl = options.apiBaseUrl;
    this.apiToken = options.apiToken;
    this.bridgeId = options.bridgeId;
    this.factoryId = options.factoryId;
    this.dataDir = options.dataDir;
    this.backupDir = path.join(this.dataDir, 'backups');
  }

  scheduleDaily(timeStr: string = '02:00'): void {
    if (this.checkScheduled) return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const checkInterval = (): void => {
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      // If target time has passed today, schedule for tomorrow
      if (now > target) {
        target.setDate(target.getDate() + 1);
      }

      const delay = target.getTime() - now.getTime();
      logger.info({ nextCheck: target.toISOString(), delaySec: Math.round(delay / 1000) }, 'Next upgrade check scheduled');

      setTimeout(async () => {
        try {
          await this.check();
        } catch (err) {
          logger.error({ err }, 'Upgrade check error');
        }
        checkInterval(); // Schedule next check
      }, delay);
    };

    checkInterval();
    this.checkScheduled = true;
  }

  async check(): Promise<boolean> {
    logger.info({ currentVersion: this.currentVersion }, 'Checking for updates');

    try {
      const updateInfo = await this.fetchUpdateInfo();

      if (!updateInfo) {
        logger.info('Already on latest version');
        return false;
      }

      logger.info({ newVersion: updateInfo.version }, 'Update available');
      await this.download(updateInfo);
      await this.apply(updateInfo);

      return true;
    } catch (err) {
      logger.error({ err }, 'Update failed');
      await this.rollback();
      throw err;
    }
  }

  private async fetchUpdateInfo(): Promise<UpdateInfo | null> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/v1/bridge/updates/check?version=${this.currentVersion}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'X-Bridge-ID': this.bridgeId,
          'X-Factory-ID': this.factoryId,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Update check failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { available: boolean; update?: UpdateInfo };

    if (!data.available || !data.update) {
      return null;
    }

    return data.update;
  }

  private async download(updateInfo: UpdateInfo): Promise<string> {
    logger.info({ version: updateInfo.version, url: updateInfo.url }, 'Downloading update');

    const response = await fetch(updateInfo.url);
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Verify checksum if provided
    if (updateInfo.checksum) {
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256');
      hash.update(Buffer.from(buffer));
      const digest = hash.digest('hex');

      if (digest !== updateInfo.checksum) {
        throw new Error(`Checksum mismatch: expected ${updateInfo.checksum}, got ${digest}`);
      }
    }

    // Save to temp location
    const tmpPath = path.join(this.dataDir, `bridge-${updateInfo.version}.tmp`);
    await fs.writeFile(tmpPath, Buffer.from(buffer));

    logger.info({ tmpPath }, 'Download complete');
    return tmpPath;
  }

  private async apply(updateInfo: UpdateInfo): Promise<void> {
    logger.info({ version: updateInfo.version }, 'Applying update');

    // Backup current binary
    await this.backupCurrent();

    // Replace binary
    const tmpPath = path.join(this.dataDir, `bridge-${updateInfo.version}.tmp`);
    const execPath = process.execPath;

    // On Unix: replace executable file
    if (os.platform() !== 'win32') {
      await fs.copyFile(tmpPath, execPath);
      // Make executable
      await fs.chmod(execPath, 0o755);
    } else {
      // On Windows: would typically require process restart to replace .exe
      // For now, copy to new location and require manual restart
      const newPath = `${execPath}.new`;
      await fs.copyFile(tmpPath, newPath);
    }

    // Clean up temp file
    await fs.unlink(tmpPath);

    logger.info('Update applied — restart required');

    // In a real scenario, trigger process restart
    // For safety, log and require manual verification
  }

  private async backupCurrent(): Promise<void> {
    const execPath = process.execPath;
    const execName = path.basename(execPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${execName}.${timestamp}`);

    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.copyFile(execPath, backupPath);

    logger.info({ backupPath }, 'Current version backed up');
  }

  async rollback(): Promise<void> {
    logger.info('Rolling back to previous version');

    try {
      const backups = await fs.readdir(this.backupDir);
      if (backups.length === 0) {
        throw new Error('No backups available');
      }

      // Get most recent backup
      const latest = backups.sort().reverse()[0];
      const backupPath = path.join(this.backupDir, latest);
      const execPath = process.execPath;

      // Restore from backup
      await fs.copyFile(backupPath, execPath);
      if (process.platform !== 'win32') {
        await fs.chmod(execPath, 0o755);
      }

      logger.info({ restoredFrom: latest }, 'Rollback complete');
    } catch (err) {
      logger.error({ err }, 'Rollback failed');
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }
}
