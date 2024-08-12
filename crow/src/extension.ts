import {
  ExtensionContext,
  window,
  commands,
  env,
  Uri,
  languages,
  workspace,
  extensions,
} from 'vscode';
import ChatViewProvider from './providers/ChatViewProvider';
import PlayerViewProvider from './providers/PlayerViewProvider';
import InlineChatProvider from './providers/InlineChatProvider';
import CodeLensProvider from './providers/CodeLensProvider';
import CompletionItemProvider from './providers/CompletionItemProvider';
import CssCompletionItemProvider from './providers/CompletionItemProvider/cssProvider';
import InlineCompletionItemProvider from './providers/InlineCompletionItemProvider';
import ReadOnlyFileSystemProvider from './providers/ReadOnlyFileSystemProvider';
import { WorkspaceDelegate } from './utilities/workspace';
import { GlobalState } from './utilities/state';
import { Logger } from './utilities/logger';
import {
  USER_TOKEN_KEY,
  EXTENSION_ID,
  CHAT_MODE_KEY,
  USER_TOKEN_CONTEXT_KEY,
  USER_INFO_KEY,
  CROW_LOGIN,
  CROW_SCM_COMMIT_MSG_GENERATING,
  CROW_CLI_SYNC_STATUS,
  CrowCliStatus,
  CROW_PLAYER_STATUS,
  CROW_USER_INFO,
  CROW_WHITE_LIST,
} from './constants';
import { ChatMode, TBStartMode } from './types';
import { getUserInfo, compatibleLangChain } from './utilities/common';
import eventEmitter from './utilities/events';
import CommitHandler from './utilities/commit';
import CliHandler from './utilities/cli';

import { getInterface as getKeystrokeStats } from './timeMaster/recorders/keystrokeStats/recoder';
import { getInterface as getUsageStatsRecorder } from './timeMaster/recorders/usageStats/recorder';

const session: Record<string, any> = {};

const keystrokeStatsRecorder = getKeystrokeStats();
const usageStatsRecorder = getUsageStatsRecorder();

export function activate(context: ExtensionContext) {
  // node16以下fetch与stream兼容
  compatibleLangChain();

  // commit工具注册
  const commitHandler = new CommitHandler(context);

  // cli工具注册
  const cliHandler = new CliHandler(context, commitHandler);

  // time-master工具注册
  keystrokeStatsRecorder.activate(context).catch((e) => {
    console.log(e);
    // logger.error('[TimeMaster][extension] activate keystrokeStatsRecorder got error:', e);
  });
  usageStatsRecorder.activate().catch((e) => {
    console.log(e);
  });

  // 初始化日志
  Logger.getInstance(context);

  // 初始化变量
  GlobalState.get(context, CROW_LOGIN).sync();
  GlobalState.get(context, CHAT_MODE_KEY, ChatMode.Free).sync();
  GlobalState.get(context, CROW_SCM_COMMIT_MSG_GENERATING, false).sync();
  GlobalState.get(context, CROW_CLI_SYNC_STATUS, CrowCliStatus.waitLoad).sync();
  GlobalState.get(context, CROW_PLAYER_STATUS, false).sync();
  // 监听 Token 更新并同步到全局
  WorkspaceDelegate.onConfigChange(USER_TOKEN_KEY, (userToken: string | undefined) => {
    try {
      if (!userToken) {
        throw new Error('User token is missing in the configuration.');
      }
      const base64Token: string = Buffer.from(userToken).toString('base64');
      GlobalState.set(context, USER_TOKEN_CONTEXT_KEY, base64Token);
      // token更新后，同步到乌鸦cli
      cliHandler.syncCli(context);
    } catch (error) {
      console.error('Error occurred while updating the user token: ', error);
    }
  });

  if (!GlobalState.get(context, USER_INFO_KEY).value) {
    GlobalState.set(context, USER_INFO_KEY, getUserInfo());
  }

  // 注册侧边栏为对话框界面
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      new ChatViewProvider(context.extensionUri, context, session),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  // 注册底部panel播放器界面
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      PlayerViewProvider.viewType,
      new PlayerViewProvider(context.extensionUri, context, session),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  const inlineChatProvider = new InlineChatProvider(context);
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.inlineChat', () => {
      inlineChatProvider.createWebviewTextEditorInset(window.activeTextEditor);
    }),
  );

  // 打开 Crow 相关的设置项
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.openSettings', () => {
      commands.executeCommand('workbench.action.openSettings', `@ext:${EXTENSION_ID}`);
    }),
  );

  // 打开使用手册
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.openUserManual', async () => {
      const url = 'https://aliyuque.antfin.com/gdn4pn/hl49mw';
      await env.openExternal(Uri.parse(url));
    }),
  );

  // 快捷键激活 chat 对话框
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.activate', async () => {
      await commands.executeCommand('workbench.view.extension.crow-chat-view-container');
      GlobalState.set(context, 'setInputFocus', true);
      return await new Promise((resolve, reject) => {
        const webViewInit = session.webViewInit;
        if (webViewInit) {
          return resolve(true);
        }
        const timer = setTimeout(() => {
          reject(false);
        }, 5000);
        eventEmitter.on('@WEBVIEW_INIT', () => {
          clearTimeout(timer);
          resolve(true);
        });
      });
    }),
  );

  // 快捷键激活 chat 对话框
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.testMode', () => {
      GlobalState.set(context, 'useTestMode', true);
    }),
  );

  // 白名单-是否显示动线播放器
  const userInfo = GlobalState.get(context, CROW_USER_INFO).value;
  GlobalState.set(context, CROW_PLAYER_STATUS, CROW_WHITE_LIST.includes(userInfo.workId)).then(
    (value) => {
      value.sync();
    },
  );

  context.subscriptions.push(
    commands.registerCommand('_crowCopilot.playerStatus', async () => {
      const selectedItem = await window.showQuickPick(['Yes', 'No']);
      if (selectedItem === 'Yes') {
        GlobalState.set(context, CROW_PLAYER_STATUS, true).then((value) => {
          value.sync();
          commands.executeCommand('workbench.view.extension.crow-player-view-container');
        });
      } else if (selectedItem === 'No') {
        GlobalState.set(context, CROW_PLAYER_STATUS, false).then((value) => {
          value.sync();
        });
      }
    }),
  );

  // 开发模式激活上传crow.vsix文件
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.uploadMode', () => {
      GlobalState.set(context, 'useUploadMode', true).then((value) => {
        value.sync();
      });
    }),
  );

  // 调整上下文对话框模式为生成代码
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.useDevMind', () => {
      GlobalState.set(context, CHAT_MODE_KEY, ChatMode.DevMind).then((value) => {
        value.sync();
      });
    }),
  );

  // 调整上下文对话框模式为自由对话
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.useFreeChat', () => {
      GlobalState.set(context, CHAT_MODE_KEY, ChatMode.Free).then((value) => {
        value.sync();
      });
    }),
  );

  const defaultSupportLanguages = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact',
  ];
  const codeLensProvider = new CodeLensProvider();
  languages.registerCodeLensProvider(defaultSupportLanguages, codeLensProvider);
  const codeLensModules = codeLensProvider.modules;
  Object.keys(codeLensModules).forEach((key) => {
    context.subscriptions.push(
      commands.registerCommand(codeLensModules[key].command, codeLensModules[key].commandHandler),
    );
  });

  const supportCssLanguages = ['css', 'less', 'scss'];
  // 补全
  languages.registerCompletionItemProvider(defaultSupportLanguages, new CompletionItemProvider());
  // css补全
  languages.registerCompletionItemProvider(supportCssLanguages, new CssCompletionItemProvider());
  // 内联补全
  languages.registerInlineCompletionItemProvider(
    defaultSupportLanguages,
    new InlineCompletionItemProvider(context),
  );

  // 注册只读文件系统
  const fileSystemProvider = new ReadOnlyFileSystemProvider();
  context.subscriptions.push(
    workspace.registerFileSystemProvider('crow-readonly', fileSystemProvider, {
      isReadonly: true,
      isCaseSensitive: true,
    }),
  );

  // 快捷指令 shortcut fix
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.fix', () => {
      commands.executeCommand('crowCopilot.activate').then(() => {
        eventEmitter.emit('message', {
          type: 'shortcut',
          content: {
            method: 'getFormatPrompt',
            key: 'fix',
          },
        });
      });
    }),
  );

  // 快捷指令 shortcut explain
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.explain', () => {
      commands.executeCommand('crowCopilot.activate').then(() => {
        eventEmitter.emit('message', {
          type: 'shortcut',
          content: {
            method: 'getFormatPrompt',
            key: 'explain',
          },
        });
      });
    }),
  );

  // 快捷指令 shortcut refactor
  context.subscriptions.push(
    commands.registerCommand('crowCopilot.refactor', () => {
      commands.executeCommand('crowCopilot.activate').then(() => {
        eventEmitter.emit('message', {
          type: 'shortcut',
          content: {
            method: 'getFormatPrompt',
            key: 'refactor',
          },
        });
      });
    }),
  );

  context.subscriptions.push(
    commands.registerCommand('crowCopilot.addSession', () => {
      eventEmitter.emit('message', {
        type: 'sessions',
        content: {
          method: 'addSession',
        },
      });
    }),
  );

  context.subscriptions.push(
    commands.registerCommand('crowCopilot.logOut', () => {
      GlobalState.set(context, CROW_LOGIN, false).then((value) => {
        value.sync();
      });
    }),
  );
}

export async function deactivate() {
  try {
    await Promise.all([keystrokeStatsRecorder.deactivate(), usageStatsRecorder.deactivate()]);
  } catch (e) {}
}
