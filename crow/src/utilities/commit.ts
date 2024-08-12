import {
  ExtensionContext,
  workspace,
  window,
  StatusBarAlignment,
  StatusBarItem,
  SourceControl,
  ProgressLocation,
  extensions,
  commands,
} from 'vscode';
import cp from 'child_process';
import { Repository, GitExtension } from '../types';
import { FreeChat } from './chat';
import { Logger } from './logger';
import { GlobalState } from './state';
import { childProcessExec as cpExec } from './common';
import {
  CROW_SCM_COMMIT_MSG_GENERATING,
  Schemes,
  CommitCommands,
  CROW_CLI_SYNC_STATUS,
  CrowCliStatus,
} from '../constants';
import { outputChannel } from './logger';

export default class CommitHandler {
  private freeChat: FreeChat;
  private ctx: ExtensionContext;
  private isCancel: boolean = false;
  public statusBarItem: StatusBarItem;

  constructor(readonly context: ExtensionContext) {
    this.freeChat = new FreeChat(context);
    this.ctx = context;

    this.resgisterCommand(context);

    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 10000 - 2);
    const status = GlobalState.get(this.context, CROW_CLI_SYNC_STATUS).value;
    if (status === CrowCliStatus.loadFail) {
      this.statusBarItemInfo({
        text: '$(x) crow-cli同步失败',
        tooltip: '重新执行',
        command: 'crowCopilot.syncCli',
      });
    } else {
      this.statusBarItemInfo();
    }
    this.statusBarItem.show();
  }

  private resgisterCommand(context: ExtensionContext) {
    [
      CommitCommands.SourceMenuCommit,
      CommitCommands.StatusBarCommit,
      CommitCommands.TerminalCommit,
    ].forEach((command) => {
      context.subscriptions.push(
        commands.registerCommand(`crowCopilot.${command}`, (arg) => {
          this.generateCommitMsg(arg, command);
        }),
      );
    });

    context.subscriptions.push(
      commands.registerCommand('crowCopilot.cancelGenCommit', (arg) => {
        this.cancelCommitMsg(arg);
      }),
    );
  }

  // 获取vscode内置git扩展
  private getGitExtension() {
    const vscodeGit = extensions.getExtension<GitExtension>('vscode.git');
    const gitExtension = vscodeGit && vscodeGit.exports;
    return gitExtension && gitExtension.getAPI(1);
  }

  // 获取当前git repo信息
  private async getRepo(uri?: SourceControl): Promise<Repository | undefined> {
    const git = this.getGitExtension();
    if (!git) {
      throw new Error('Git扩展加载失败');
    }
    if (uri) {
      const uriPath = uri.rootUri?.path;
      return git.repositories.find((r) => r.rootUri.path === uriPath);
    }
    if (git.repositories.length === 1) {
      return git.repositories[0];
    }
    if (git.repositories.length > 1) {
      const repositoryName = await window.showQuickPick(
        git.repositories.map((r) => {
          return workspace.getWorkspaceFolder(r.rootUri)?.name || '';
        }),
        { placeHolder: '选择需要生成commit信息的仓库' },
      );

      if (!repositoryName) {
        return undefined;
      }

      return git.repositories.find((r) => {
        return workspace.getWorkspaceFolder(r.rootUri)?.name === repositoryName;
      });
    }

    throw new Error('工作区中没有打开的文件夹');
  }

  public statusBarItemInfo(args?: { text?: string; tooltip?: string; command?: string }) {
    const { text, tooltip, command } = args || {};
    this.statusBarItem.text = text || '$(sparkle-icon) Crow Commit';
    this.statusBarItem.tooltip = tooltip || '使用Crow生成commit信息 ✨';
    this.statusBarItem.command = command || 'crowCopilot.statusBarCommit';
  }

  // 判断是否有暂存/未暂存的更改
  private checkGitRepo(cwd: string, type: 'staged' | 'unstaged') {
    return new Promise((resolve, reject) => {
      cp.exec(`git diff ${type === 'staged' ? '--cached' : ''} --quiet`, { cwd }, (error) => {
        if (error) {
          if (error.code === 1) {
            resolve(true);
          } else {
            reject(error);
          }
        } else {
          resolve(false);
        }
      });
    });
  }

  // 获取git仓库状态 staged/unstaged
  private async getRepoStatus(cwd: string): Promise<boolean | undefined> {
    const hasStagedChanges = await this.checkGitRepo(cwd, 'staged');
    const hasUnstagedChanges = await this.checkGitRepo(cwd, 'unstaged');

    let useStaged = false;

    if (hasStagedChanges) {
      useStaged = true;
    }

    if (hasUnstagedChanges) {
      useStaged = false;
    }

    if (hasStagedChanges && hasUnstagedChanges) {
      const optionFirst = '为目前暂存的更改生成msg';
      const optionSecond = '执行暂存操作并为所有更改生成msg';

      const selection = await window.showQuickPick([optionFirst, optionSecond], {
        placeHolder: '发现仓库中同时存在暂存&未暂存的更改',
      });

      if (selection === optionFirst) {
        useStaged = true;
      }

      if (selection === optionSecond) {
        await cpExec(`git add .`, { cwd });
        useStaged = true;
      }

      if (!selection) {
        return undefined;
      }
    }

    return useStaged;
  }

  private updateStatus(isCancel: boolean) {
    this.isCancel = isCancel;
    this.updateLoadingState(false);
    this.statusBarItemInfo();
  }

  private async updateLoadingState(value: boolean) {
    (await GlobalState.set(this.ctx, CROW_SCM_COMMIT_MSG_GENERATING, value)).sync();
  }

  public async generateCommitMsg(arg: any, from: string) {
    return window.withProgress(
      {
        location: ProgressLocation.SourceControl,
        title: 'Generating commit message...',
        cancellable: false,
      },
      async (progress, token) => {
        const repo = await this.getRepo(arg);
        if (!repo) {
          return;
        }

        const projectName: string | undefined = workspace.getWorkspaceFolder(repo.rootUri)?.name;

        try {
          const text =
            from !== CommitCommands.SourceMenuCommit
              ? 'Crow-Cli 调度中...'
              : '正在生成commit信息...';

          this.statusBarItemInfo({
            text: `$(loading~spin) ${text}`,
            tooltip: '点击取消生成',
            command: 'crowCopilot.cancelGenCommit',
          });

          this.updateLoadingState(true);

          const useStaged = await this.getRepoStatus(repo.rootUri.fsPath);

          if (useStaged === undefined) {
            this.updateStatus(false);
            return;
          }

          if (from !== CommitCommands.SourceMenuCommit) {
            const oldTerminal = window.terminals?.find((t) => t.name === Schemes.Commit);
            if (oldTerminal) {
              oldTerminal.dispose();
            }
            const terminal = await window.createTerminal({
              name: Schemes.Commit,
              cwd: repo.rootUri.fsPath,
              env: { COMMIT_FROM: `${from}` },
            });

            terminal.show();
            setTimeout(() => {
              const option = `${!useStaged ? '--unstaged' : ''}`;
              terminal.sendText(`crow commit -m ${option}`);
            }, 2000);
          }

          if (from === CommitCommands.SourceMenuCommit) {
            const env = `COMMIT_FROM=${from} COMMIT_ONLY_MSG=true`;
            const option = `${!useStaged ? '--unstaged' : ''}`;
            let commitMsg = await cpExec(`${env} crow commit -m ${option}`, {
              cwd: repo.rootUri.fsPath,
              encoding: 'utf8',
            });

            if (!commitMsg) {
              throw new Error('未能生成有效的commit信息，请重试');
            }

            commitMsg = commitMsg.trim();

            if (this.isCancel) {
              this.isCancel = false;
              return;
            }

            if (from === CommitCommands.SourceMenuCommit) {
              repo.inputBox.value = commitMsg;
            }
          }
        } catch (error: any) {
          outputChannel.log(`[Crow Commit] commit信息生成失败: ${error}`);

          if (error?.message === 'canceled') {
            return;
          }
          window.showErrorMessage(`commit信息生成失败，请重试: ${error}`);
        } finally {
          if (from !== CommitCommands.SourceMenuCommit) {
            setTimeout(() => {
              this.updateStatus(false);
            }, 2000);
          } else {
            this.updateStatus(false);
          }
        }
      },
    );
  }

  public async cancelCommitMsg(arg: any) {
    let projectName: string | undefined = '';
    if (arg) {
      projectName = workspace.getWorkspaceFolder(arg.rootUri)?.name;
    }

    try {
      await this.freeChat!.cancelCurrentChat();
      this.updateStatus(true);
    } catch (error) {
      this.updateStatus(false);
      outputChannel.log(`[Crow Commit] cancel commit msg error: ${error}`);
    }
  }
}
