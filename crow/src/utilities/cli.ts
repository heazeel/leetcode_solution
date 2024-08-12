import { ExtensionContext, workspace, FileSystemWatcher, commands } from 'vscode';
import axios from 'axios';
import { GlobalState } from './state';
import { childProcessExec as cpExec, getUserInfo } from './common';
import {
  USER_TOKEN_CONTEXT_KEY,
  CROW_CLI_SYNC_KEY,
  ALIBABA_API_KEY,
  CROW_CLI_SYNC_STATUS,
  CrowCliStatus,
} from '../constants';
import { WorkspaceDelegate } from './workspace';
import { outputChannel } from './logger';
import CommitHandler from './commit';

export default class CliHandler {
  private static hasEventInstance: boolean = false;
  private commitHandler: CommitHandler;

  constructor(readonly context: ExtensionContext, commitHandler: CommitHandler) {
    this.commitHandler = commitHandler;
    this.resgisterCommand(context);
    this.syncCli(context);
  }

  private resgisterCommand(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand('crowCopilot.syncCli', (arg) => {
        this.syncCli(context);
      }),
    );
  }

  // 获取cli版本
  public async getCliVersion(): Promise<string> {
    try {
      return await cpExec('crow --version', { encoding: 'utf8' });
    } catch (error: any) {
      return '';
    }
  }

  // 获取最新cli版本
  public async getLatestCliVersion(): Promise<string> {
    try {
      const url = `cli的下载地址`;
      const res = await axios(url);
      const manifest = res.data;
      const latestVersion = manifest['dist-tags'].latest;
      return latestVersion;
    } catch (error: any) {
      return '';
    }
  }

  // 下载cli
  public async installCli() {
    try {
      this.commitHandler.statusBarItem.text = '$(sync~spin) crow-cli同步中...';
      this.commitHandler.statusBarItem.tooltip = undefined;
      this.commitHandler.statusBarItem.command = undefined;

      const cmd = 'npm下载cli';
      const stdout = await cpExec(cmd, { encoding: 'utf8' });

      return stdout;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  public async syncGitHookFile(bool: boolean) {
    const folders = workspace.workspaceFolders;
    if (folders?.length) {
      for (const folder of folders) {
        const cwd = folder.uri.fsPath;
        let watcher: FileSystemWatcher | undefined;
        let stdout = '';
        try {
          if (bool) {
            stdout = await cpExec('crow commit --sync', { cwd });
            const githooksPath = stdout.split(':')?.[1]?.trim();

            if (!watcher) {
              watcher = workspace.createFileSystemWatcher(githooksPath, true, false, true);
            }

            watcher.onDidChange(async (e) => {
              const content = (await workspace.fs.readFile(e)).toString();
              if (!content.includes('Created by crow-cli')) {
                outputChannel.log('[CROW CLI] GitHooks重新同步');
                cpExec('crow commit --sync', { cwd });
              }
            });
          } else {
            stdout = await cpExec('crow commit --unsync', { cwd });
            if (watcher) {
              watcher.dispose();
            }
          }
          outputChannel.log(`[CROW CLI] ${stdout}`);
        } catch (error: any) {
          outputChannel.log(`[CROW CLI] GitHooks同步失败: ${error.message}`);
        }
      }
    }
  }

  // 同步乌鸦cli
  public async syncCli(context: ExtensionContext) {
    (await GlobalState.set(this.context, CROW_CLI_SYNC_STATUS, CrowCliStatus.loading)).sync();
    const userToken = GlobalState.get(context, USER_TOKEN_CONTEXT_KEY);
    const userInfo = getUserInfo(context);
    if (!userToken || !userToken.value) {
      return null;
    }

    try {
      let version = await this.getCliVersion();
      version = version.replace(/[\r\n]+/g, '');
      if (!version) {
        outputChannel.log(`[CROW CLI] [install] start`);
        const stdout = await this.installCli();
        outputChannel.log(`[CROW CLI] [install] ${stdout}`);
      } else {
        const latestVersion = await this.getLatestCliVersion();
        // 拉取最新版本
        if (latestVersion && version !== latestVersion) {
          outputChannel.log(`[CROW CLI] [update] start`);
          const stdout = await this.installCli();
          outputChannel.log(`[CROW CLI] [update] ${stdout}`);
        }
      }

      const configs = [
        `token ${userToken.value}`,
        `alibabaApiKey ${ALIBABA_API_KEY}`,
        `userId ${userInfo.userId}`,
        `username ${userInfo.username}`,
      ];
      await cpExec(`crow config --set ${configs.join(' ')}`);
      outputChannel.log(`[CROW CLI] 用户信息同步成功`);

      const doSync = GlobalState.get(context, CROW_CLI_SYNC_KEY).value;
      if (typeof doSync === 'boolean') {
        this.syncGitHookFile(doSync);
      }

      if (!CliHandler.hasEventInstance) {
        WorkspaceDelegate.onConfigChange(CROW_CLI_SYNC_KEY, (doSync: boolean) => {
          try {
            GlobalState.set(context, CROW_CLI_SYNC_KEY, doSync);
            this.syncGitHookFile(doSync);
            CliHandler.hasEventInstance = true;
          } catch (error) {
            outputChannel.log(`Error occurred while updating the crow sync config: ${error}`);
          }
        });
      }

      (await GlobalState.set(this.context, CROW_CLI_SYNC_STATUS, CrowCliStatus.normal)).sync();
      this.commitHandler.statusBarItemInfo();
    } catch (error: any) {
      (await GlobalState.set(this.context, CROW_CLI_SYNC_STATUS, CrowCliStatus.loadFail)).sync();
      this.commitHandler.statusBarItemInfo({
        text: '$(x) crow-cli同步失败',
        tooltip: '重新执行',
        command: 'crowCopilot.syncCli',
      });
      outputChannel.log(`[CROW CLI] crow-cli同步失败: ${error.message}`);
    }
  }
}
