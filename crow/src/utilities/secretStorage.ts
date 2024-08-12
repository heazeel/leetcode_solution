import { SecretStorage as secStorageType } from 'vscode';
import { Logger } from './logger';

export class SecretStorage {
  constructor(public storage: secStorageType) {}
  // 更新storage
  public async setItem(key: string, value: any): Promise<any> {
    try {
      await this.storage.store(key, value);
    } catch (error) {
      Logger.instance.error(`[SecretStorage Update] - Fail`, error);
    }
  }
  // 获取storage
  public async getItem(key: string): Promise<any> {
    const value = await this.storage.get(key);
    return value;
  }
  // 删除storage
  public async deleteItem(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      Logger.instance.error(`[SecretStorage Delete] - Fail`, error);
    }
  }
}
