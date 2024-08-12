import { ExtensionContext } from 'vscode';
import { MessageDelegate } from '../utilities/message';
import { SecretStorage } from '../utilities/secretStorage';
import { ISecretStorage } from '../types';

export abstract class Register<Received = any, Shared = any> {
  public messageName?: string;
  public shared?: Shared;
  public secretStorage?: ISecretStorage;

  constructor(
    readonly delegate: MessageDelegate,
    readonly context: ExtensionContext,
  ) {
    this.secretStorage = new SecretStorage(context.secrets);
  }

  public abstract handleContent(content: Received): void;

  public async getToken() {
    const token = await this.secretStorage?.getItem('uuid');
    return token;
  }

  public register(shared?: Shared) {
    this.shared = shared;
    if (this.messageName) {
      this.delegate.on(this.messageName, this.handleContent.bind(this));
    } else {
      console.warn('Register message name is not defined');
    }
  }
}

export abstract class MultiRegister<Shared> {
  constructor(
    readonly delegate: MessageDelegate,
    readonly context?: ExtensionContext,
  ) {}

  public abstract register(shared: Shared): void;
}
