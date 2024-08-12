import crypto from 'crypto';
import { LRUCache } from '../../utilities/lruCache';

export default class CacheHandler {
  public completionCache;
  private globalCache: {
    prefixCache: string;
    suffixCache: string;
    promptKeyCache: string;
  } = {
    prefixCache: '',
    suffixCache: '',
    promptKeyCache: '',
  };

  constructor() {
    this.completionCache = new LRUCache<string, string[]>(100);
  }

  public isGlobalCacheEmpty(): boolean {
    return !(
      this.globalCache.prefixCache &&
      this.globalCache.suffixCache &&
      this.globalCache.promptKeyCache?.length
    );
  }

  public updateGlobalCache(prefix: string, suffix: string, promptKey: string) {
    this.globalCache.prefixCache = prefix;
    this.globalCache.suffixCache = suffix;
    this.globalCache.promptKeyCache = promptKey;
  }

  public getCachedChoices(prefix: string, suffix: string): string[] | undefined {
    const isSamePrefix =
      !!this.globalCache.prefixCache && prefix.startsWith(this.globalCache.prefixCache);
    const isSameSuffix = !!this.globalCache.suffixCache && suffix === this.globalCache.suffixCache;
    if (!isSamePrefix || !isSameSuffix || !this.globalCache.promptKeyCache) {
      return;
    }

    const cachedChoices = this.completionCache.get(this.globalCache.promptKeyCache);
    if (!cachedChoices) {
      return;
    }

    // 比缓存prefix多出的部分
    const remainingPrefix = prefix.substring(this.globalCache.prefixCache.length);

    const newChoices: string[] = [];
    cachedChoices.forEach((choice: string) => {
      if (choice.startsWith(remainingPrefix)) {
        choice = choice.substring(remainingPrefix.length);
        newChoices.push(choice);
      }
    });

    if (newChoices.length) {
      return newChoices;
    }
  }

  public keyForPrompt(key: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(key);
    return hash.digest('hex');
  }

  public setLRUPromptKeyCache(prefix: string, suffix: string, prompt: string[]) {
    const key = this.keyForPrompt(prefix + suffix);
    this.completionCache.put(key, prompt);
  }
}
