import { Register } from './base';

type Method = 'addSession';

export interface CallParameter {
  method: Method;
  text?: string;
}

export default class SessionsRegister extends Register<CallParameter> {
  public messageName = 'sessions';

  public handleContent(content: CallParameter) {
    const { method } = content;
    if (method === 'addSession') {
      this.delegate.postMessage('addSession', {});
    }
  }
}
