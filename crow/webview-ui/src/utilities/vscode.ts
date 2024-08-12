import type { WebviewApi } from 'vscode-webview';

export class WebSocketClient {
  public connected: boolean = false;
  private webSocket: WebSocket;
  private pending: any[] = [];

  constructor(readonly port: number = 8965) {
    this.webSocket = new WebSocket(`ws://localhost:${this.port}`);
    this.webSocket.onopen = () => {
      console.log('[WebSocketClient] connect success');
      this.connected = true;
      this.flushPending();
    };
    this.webSocket.onmessage = (ev: MessageEvent) => {
      const data = ev.data;
      try {
        const message = JSON.parse(data);
        window.postMessage(message, '*');
        console.log('[WebSocketClient] on message:', message);
      } catch (error) {
        console.error('[WebSocketClient] message data error:', error);
      }
    };
    this.webSocket.onclose = () => {
      console.log('[WebSocketClient] close connect');
      this.connected = false;
    };
    this.webSocket.onerror = (ev: Event) => {
      console.error('[WebSocketClient] connect error:', ev);
    };
  }

  private flushPending() {
    while (this.pending.length) {
      const message = this.pending.pop();
      console.log('[WebSocketClient] flush message:', message);
      this.postMessage(message);
    }
  }

  public postMessage(message: unknown) {
    if (this.connected) {
      this.webSocket.send(JSON.stringify(message));
    } else {
      this.pending.push(message);
    }
  }
}

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension
 * contexts.
 *
 * This utility also enables webview code to be run in a web browser-based
 * dev server by using native web browser features that mock the functionality
 * enabled by acquireVsCodeApi.
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;
  private readonly webSocketClient: WebSocketClient | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current development
    // context (i.e. VS Code development window or web browser)
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }

    // 检测是否在 VSCode Webview 中
    if (!/Code\/(.*) Electron\//.test(navigator.userAgent)) {
      this.webSocketClient = new WebSocketClient();
    }
  }

  /**
   * Post a message (i.e. send arbitrary data) to the owner of the webview.
   *
   * @remarks When running webview code inside a web browser, postMessage will instead
   * log the given message to the console.
   *
   * @param message Abitrary data (must be JSON serializable) to send to the extension context.
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else if (this.webSocketClient) {
      this.webSocketClient.postMessage(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Get the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, getState will retrieve state
   * from local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @return The current state or `undefined` if no state has been set.
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem('vscodeState');
      return state ? JSON.parse(state) : undefined;
    }
  }

  /**
   * Set the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, setState will set the given
   * state using local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @param newState New persisted state. This must be a JSON serializable object. Can be retrieved
   * using {@link getState}.
   *
   * @return The new state.
   */
  public setState<T extends unknown | undefined>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem('vscodeState', JSON.stringify(newState));
      return newState;
    }
  }
}

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
export const vscode = new VSCodeAPIWrapper();
