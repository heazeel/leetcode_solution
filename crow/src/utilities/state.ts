import { ExtensionContext, EventEmitter, commands } from 'vscode';

/**
 * 可同步数据到上下文的值
 */
export class SyncableValue {
  constructor(readonly _key: string, readonly _value: any) {}
  public sync() {
    commands.executeCommand('setContext', this._key, this._value);
  }
  valueOf() {
    return this._value;
  }
  get value() {
    return this._value;
  }
}

export class GlobalState {
  private static eventEmitter = new EventEmitter<{
    key: string;
    value: any;
  }>();
  public static onDidChangeState = GlobalState.eventEmitter.event;

  /**
   * 获取全局状态的一个值
   * @param context 插件上下文
   * @param key 键的名称
   * @param defaultValue 如果键不存在时要返回的默认值
   * @param sync 是否同步到 context 上
   */
  public static get<T>(
    context: ExtensionContext,
    key: string,
    defaultValue?: T,
  ) {
    const value = context.globalState.get<T>(key);
    if (typeof value === 'undefined') {
      return new SyncableValue(key, defaultValue);
    }
    return new SyncableValue(key, value);
  }

  /**
  * 设置全局状态的一个值
  * @param context 插件上下文
  * @param key 键的名称
  * @param newValue 要存储的新值
  */
  public static async set<T>(
    context: ExtensionContext,
    key: string,
    newValue: T,
  ) {
    await context.globalState.update(key, newValue);
    GlobalState.eventEmitter.fire({
      key,
      value: newValue
    });
    return new SyncableValue(key, newValue);
  }
}
