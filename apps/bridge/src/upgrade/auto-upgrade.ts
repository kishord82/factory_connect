/**
 * D10: Auto-upgrader — checks for and applies updates automatically.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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
      console.log(`[AutoUpgrader] Next check at ${target.toISOString()} (in ${Math.round(delay / 1000)}s)`);

      setTimeout(async () => {
        try {
          await this.check();
        } catch (err) {
          console.error('[AutoUpgrader] Check error:', err);
        }
        checkInterval(); // Schedule next check
      }, delay);
    };

    checkInterval();
    this.checkScheduled = true;
  }

  async check(): Promise<boolean> {
    console.log(`[AutoUpgrader] Checking for updates (current: ${this.currentVersion})`);

    try {
      const updateInfo = await this.fetchUpdateInfo();

      if (!updateInfo) {
        console.log('[AutoUpgrader] Already on latest version');
        return false;
      }

      console.log(`[AutoUpgrader] Update available: ${updateInfo.version}`);
      await this.download(updateInfo);
      await this.apply(updateInfo);

      return true;
    } catch (err) {
      console.error('[AutoUpgrader] Update failed:', err);
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
    console.log(`[AutoUpgrader] Downloading ${updateInfo.version} from ${updateInfo.url}`);

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

    console.log(`[AutoUpgrader] Downloaded to ${tmpPath}`);
    return tmpPath;
  }

  private async apply(updateInfo: UpdateInfo): Promise<void> {
    console.log(`[AutoUpgrader] Applying update ${updateInfo.version}`);

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

    console.log(`[AutoUpgrader] Update applied. Restart required.`);

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

    console.log(`[AutoUpgrader] Current version backed up to ${backupPath}`);
  }

  async rollback(): Promise<void> {
    console.log('[AutoUpgrader] Rolling back to previous version');

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

      console.log(`[AutoUpgrader] Rolled back to ${latest}`);
    } catch (err) {
      console.error('[AutoUpgrader] Rollback failed:', err);
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }
}
