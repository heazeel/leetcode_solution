import { childProcessExec as cpExec } from './common';

export default class GitHandler {
  // 检查当前目录是否在 Git 工作树中
  public static async checkGitRepo(cwd?: string): Promise<boolean> {
    try {
      const stdout = await cpExec('git rev-parse --is-inside-work-tree', {
        cwd: cwd || process.cwd(),
        encoding: 'utf8',
      });

      if (stdout.trim() === 'true') {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // 初始化 Git 仓库
  public static async initGit(cwd?: string): Promise<void> {
    try {
      const isGitRepo = await this.checkGitRepo(cwd);
      if (!isGitRepo) {
        await cpExec('git init', { cwd: cwd || process.cwd() });
      }
    } catch (error) {
      throw new Error(`${cwd || process.cwd()}: ${error}`);
    }
  }

  // 删除 git
  public static async removeGit(cwd?: string): Promise<void> {
    try {
      await cpExec('rm -rf .git', { cwd: cwd || process.cwd() });
    } catch (error) {
      throw new Error(`${cwd || process.cwd()}: ${error}`);
    }
  }

  // 获取diff信息
  public static async getDiffInfo({ extraCmd, cwd }: { extraCmd?: string; cwd?: string }) {
    try {
      const cmd = `git diff ${extraCmd || ''}`;
      // const cmd = `git diff --no-index '0-1711936617016-start' '0-1711952867982-end'`;
      // const cmd = `git diff`;
      const stdout = await cpExec(cmd, {
        cwd: cwd || process.cwd(),
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
      });

      return stdout;
    } catch (error) {
      throw new Error(`${cwd || process.cwd()}: ${error}`);
    }
  }
}
