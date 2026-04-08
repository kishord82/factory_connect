/**
 * D9: OTP bootstrap — initial pairing with cloud API via OTP verification.
 * Stores API token securely in the file system.
 */
import * as fs from 'fs/promises';
import * as path from 'path';

export interface OTPBootstrapOptions {
  dataDir: string;
  apiBaseUrl: string;
}

export class OTPBootstrap {
  private dataDir: string;
  private apiBaseUrl: string;
  private tokenFilePath: string;

  constructor(options: OTPBootstrapOptions) {
    this.dataDir = options.dataDir;
    this.apiBaseUrl = options.apiBaseUrl;
    this.tokenFilePath = path.join(this.dataDir, '.bridge_token');
  }

  async isBootstrapped(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.tokenFilePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async requestOTP(factoryId: string): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/api/v1/bridge/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ factory_id: factoryId }),
    });

    if (!response.ok) {
      throw new Error(`OTP request failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { message_id?: string };
    return data.message_id || 'OTP sent to factory admin';
  }

  async verifyOTP(factoryId: string, otp: string): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/api/v1/bridge/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ factory_id: factoryId, otp }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`OTP verification failed: ${errorData.error || `HTTP ${response.status}`}`);
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) {
      throw new Error('No token in OTP verification response');
    }

    // Store token securely (file with restricted permissions)
    await this.storeToken(data.token);

    return data.token;
  }

  async getToken(): Promise<string | null> {
    try {
      const content = await fs.readFile(this.tokenFilePath, 'utf-8');
      return content.trim();
    } catch {
      return null;
    }
  }

  async refreshToken(): Promise<string> {
    const currentToken = await this.getToken();
    if (!currentToken) {
      throw new Error('No token stored — cannot refresh without bootstrap');
    }

    const response = await fetch(`${this.apiBaseUrl}/api/v1/bridge/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) {
      throw new Error('No token in refresh response');
    }

    await this.storeToken(data.token);
    return data.token;
  }

  private async storeToken(token: string): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });

    // Write token with restricted permissions (0600 = rw-------)
    await fs.writeFile(this.tokenFilePath, token, {
      mode: 0o600,
      flag: 'w',
    });

    console.log(`[OTPBootstrap] Token stored at ${this.tokenFilePath}`);
  }

  async clearToken(): Promise<void> {
    try {
      await fs.unlink(this.tokenFilePath);
      console.log('[OTPBootstrap] Token cleared');
    } catch {
      // File doesn't exist, no-op
    }
  }
}
