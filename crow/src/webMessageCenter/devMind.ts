import path from 'path';
import os from 'os';
import fs from 'fs';
import { ExtensionContext, workspace, Uri, window, commands } from 'vscode';
import { MultiRegister, Register } from './base';
import {
  DevMind,
  DevMindRequest,
  DevMindAskRequest,
  DevMindTellRequest,
  DevMindSessionGetRequest,
  DevMindInsertCodeInput,
  DevMindAskCodeResponse,
} from '../utilities/chat';
import { MessageDelegate } from '../utilities/message';
import { TextEditorDelegate } from '../utilities/editor';
import { Queue } from '../utilities/queue';
import { LogDecorator } from '../utilities/logger';
import { FileHelper } from '../utilities/file';
import { Schemes } from '../constants';

export class CancelDevMindRegister extends Register<void, DevMind> {
  public messageName = 'cancelDevMindMsg';

  @LogDecorator.logCallArguments('DevMind.cancelDevMindMsg')
  public handleContent() {
    this.shared!.cancelCurrentChat();
  }
}

export class DevMindSessionCreateRegister extends Register<void, DevMind> {
  public messageName = 'devMindSessionCreate';

  @LogDecorator.logCallArguments('DevMind.devMindSessionCreate')
  public handleContent() {
    this.shared!.createSession()
      .then((res) =>
        this.delegate.postMessage('devMindSessionCreateRes', {
          finishReason: 'success',
          data: res,
        }),
      )
      .catch((error) => {
        this.delegate.postMessage('devMindSessionCreateRes', {
          finishReason: 'error',
          data: '请求异常',
          error,
        });
      });
  }
}

export class DevMindSessionAskRegister extends Register<DevMindAskRequest, DevMind> {
  public messageName = 'devMindSessionAsk';
  private fileEmpty: { [name: string]: boolean } = {};
  private hasDataFlag: boolean = false;

  @LogDecorator.logCallArguments('DevMind.devMindSessionAsk')
  public handleContent(content: DevMindAskRequest) {
    const handleGenMsg = async (data: any) => {
      if (data) {
        const { filename: filePath, delta, done } = data;
        if (filePath) {
          this.hasDataFlag = true;
          this.delegate.postMessage('devMindSessionAskRes', { data });
          const sessionId = content.sessionId;

          // 完整的文件路径
          const fullFilePath = path.join(
            os.tmpdir(),
            'crow-copilot-temp',
            `${sessionId}`,
            `${filePath}`,
          );

          // const tmpFileUri = Uri.file(fullFilePath);
          const tmpFileUri = Uri.parse(`crow-readonly:${fullFilePath}`);

          const insertCode = async (code: string) => {
            if (!this.fileEmpty[fullFilePath]) {
              // 如果文件不为空，先清空文件
              // await FileHelper.clearFileContent(fullFilePath);
              await fs.promises.writeFile(fullFilePath, '');
              this.fileEmpty[fullFilePath] = true;
            }
            const doc = await workspace.openTextDocument(tmpFileUri);
            const editor = await window.showTextDocument(doc);
            TextEditorDelegate.moveCursorToLastLine(doc, editor);

            if (code) {
              // await TextEditorDelegate.insertText(editor, `${code}\n`);
              await fs.promises.appendFile(fullFilePath, `${code}\n`);
            }

            await TextEditorDelegate.revealCursor(editor);

            // if (done) {
            //   await TextEditorDelegate.editorSave(editor);
            // }
          };

          try {
            // await workspace.fs.stat(tmpFileUri);
            await fs.promises.stat(fullFilePath);
            await insertCode(delta);
          } catch (error) {
            // await workspace.fs.writeFile(tmpFileUri, new Uint8Array());

            const parsedPath = path.parse(fullFilePath);
            const fullFileDir = parsedPath.dir;

            await fs.promises.mkdir(fullFileDir, { recursive: true });
            await fs.promises.writeFile(fullFilePath, '');
            await insertCode(delta);
          }
        }
      }
    };

    const opearateQueue = new Queue(handleGenMsg);
    opearateQueue.on('emptyQueue', () => {
      let finishReason = 'success';
      if (!this.hasDataFlag) {
        finishReason = 'error';
      }

      this.delegate.postMessage('devMindSessionAskRes', {
        finishReason,
      });
      // Object.keys(this.fileEmpty).forEach(async (path) => {
      //   const tmpFileUri = Uri.file(path);
      //   const doc = await workspace.openTextDocument(tmpFileUri);
      //   const editor = await window.showTextDocument(doc);
      //   await TextEditorDelegate.editorSave(editor);
      // });
      this.fileEmpty = {};
      this.hasDataFlag = false;
    });

    this.shared!.sessionAsk(content, (data) => {
      opearateQueue.push(data);
    })
      .then((res) => {
        if (
          (content.reqBody.type === 'fix' || content.reqBody.type === 'generate') &&
          content.reqBody.target.includes('code')
        ) {
          opearateQueue.stopPush();
        } else {
          let finishReason = 'success';
          if (!res.hasData) {
            finishReason = 'error';
          }
          this.delegate.postMessage('devMindSessionAskRes', {
            finishReason,
            data: res,
          });
        }
      })
      .catch((error) => {
        this.delegate.postMessage('devMindSessionAskRes', {
          finishReason: 'error',
          data: '请求异常',
          error,
        });
      });
  }
}

export class DevMindSessionTellRegister extends Register<DevMindTellRequest, DevMind> {
  public messageName = 'devMindSessionTell';

  @LogDecorator.logCallArguments('DevMind.devMindSessionTell')
  public handleContent(content: DevMindTellRequest) {
    this.shared!.sessionTell(content)
      .then((res) =>
        this.delegate.postMessage('devMindSessionTellRes', {
          finishReason: 'success',
          data: res,
        }),
      )
      .catch((error) => {
        this.delegate.postMessage('devMindSessionTellRes', {
          finishReason: 'error',
          data: '请求异常',
          error,
        });
      });
  }
}

export class DevMindSessionGetRegister extends Register<DevMindSessionGetRequest, DevMind> {
  public messageName = 'devMindSessionGet';

  @LogDecorator.logCallArguments('DevMind.devMindSessionGet')
  public handleContent(content: DevMindSessionGetRequest) {
    this.shared!.getSession(content)
      .then((res) =>
        this.delegate.postMessage('devMindSessionGetRes', {
          finishReason: 'success',
          data: res,
        }),
      )
      .catch((error) => {
        this.delegate.postMessage('devMindSessionGetRes', {
          finishReason: 'error',
          data: '请求异常',
          error,
        });
      });
  }
}

// 插入代码
export class DevMindInsertCodeRegister extends Register<DevMindInsertCodeInput, DevMind> {
  public messageName = 'devMindInsertCode';

  @LogDecorator.logCallArguments('DevMind.devMindInsertCode')
  public async handleContent(content: DevMindInsertCodeInput) {
    const { sessionId, codes } = content;
    if (!codes?.length) {
      return;
    }

    // 关闭预览
    const closeTempPreview = async (code: any) => {
      const tmpFileUri = Uri.file(
        path.join(os.tmpdir(), './crow-copilot-temp', `${sessionId}/${code.path}`),
      );

      try {
        await workspace.fs.stat(tmpFileUri);
        const document = await workspace.openTextDocument(tmpFileUri);
        await window.showTextDocument(document);
        await commands.executeCommand('workbench.action.closeActiveEditor');
        await workspace.fs.delete(tmpFileUri);
      } catch (error) {
        console.log(error);
      }
    };

    const handleInsertMsg = async (code: any) => {
      if (code) {
        await closeTempPreview(code);

        const { path: codePath, text } = code;
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          const fullFilePath = path.join(workspaceRoot, codePath);

          const fileUri = Uri.file(fullFilePath);
          const insertCode = async (code: string) => {
            await FileHelper.clearFileContent(fullFilePath);
            await workspace.openTextDocument(fileUri);
            const _editor = window.activeTextEditor;
            if (_editor) {
              await TextEditorDelegate.insertText(_editor, code);
              await TextEditorDelegate.editorSave(_editor);
            }
          };

          try {
            await workspace.fs.stat(fileUri);
            await insertCode(text);
          } catch (error) {
            await workspace.fs.writeFile(fileUri, new Uint8Array());
            await insertCode(text);
          }
        }
      }
    };

    const opearateQueue = new Queue<{ path: string; text: string }>(handleInsertMsg, 0);
    codes.forEach((code, index) => {
      opearateQueue.push(code);
      if (index === codes.length - 1) {
        opearateQueue.stopPush();
      }
    });
  }
}

// 打开终端
export class DevMindTerminalRegister extends Register<{ text: string }, DevMind> {
  public messageName = 'devMindTerminal';

  @LogDecorator.logCallArguments('DevMind.devMindTerminal')
  public async handleContent(content: { text: string }) {
    const { text } = content;
    if (!text) {
      return;
    }

    let terminal = window.terminals.find((t) => t.name === Schemes.Terminal);
    if (!terminal) {
      terminal = window.createTerminal(Schemes.Terminal);
    }
    terminal.sendText(text);
    terminal.show();
  }
}

export default class DevMindRegister extends MultiRegister<DevMind> {
  private registers: Register[];

  constructor(readonly delegate: MessageDelegate, readonly context: ExtensionContext) {
    super(delegate, context);
    this.registers = [
      new CancelDevMindRegister(delegate, context),
      new DevMindSessionCreateRegister(delegate, context),
      new DevMindSessionGetRegister(delegate, context),
      new DevMindSessionAskRegister(delegate, context),
      new DevMindSessionTellRegister(delegate, context),
      new DevMindInsertCodeRegister(delegate, context),
      new DevMindTerminalRegister(delegate, context),
    ];
  }

  public register(shared: any) {
    this.registers.forEach((r) => r.register(shared));
  }
}
