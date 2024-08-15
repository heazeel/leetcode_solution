import path from 'path';
import fs from 'fs-extra';
import { GIT_FILE_CREATE_TAG } from '../../../const';
import {
  getRootFile,
  checkGitRepo,
  childProcessExec as execSync,
} from '../../../utils';

// 获取git hooks生效路径
const getGitRootHooksPath = async () => {
  let gitRootHooksPath = '';
  try {
    gitRootHooksPath = await execSync('git config --get core.hooksPath', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
  } catch (err) {
    return '';
  }

  return gitRootHooksPath;
};

// 获取prepare-commit-msg git hook路径
const getGitPcmHookPath = async () => {
  let gitPcmHookPath;
  const gitRootHooksPath = await getGitRootHooksPath();

  if (!gitRootHooksPath) {
    gitPcmHookPath = path.join(process.cwd(), '.git/hooks/prepare-commit-msg');
  } else {
    gitPcmHookPath = path.join(gitRootHooksPath, 'prepare-commit-msg');
  }

  return gitPcmHookPath;
};

// 检查prepare-commit-msg文件是否是crow-cli生成的
const isCmtHookCreatedByCrow = async () => {
  const gitPcmHookPath = await getGitPcmHookPath();
  if (fs.existsSync(gitPcmHookPath)) {
    const fileContent = fs.readFileSync(gitPcmHookPath, 'utf-8');
    if (fileContent.includes(GIT_FILE_CREATE_TAG)) {
      return true;
    }
  }

  return false;
};

// 取消同步生成函数到git
const cancelSyncGenerateFuncToGit = async () => {
  try {
    const isGitRepo = await checkGitRepo();
    if (isGitRepo) {
      const gitPcmHookPath = await getGitPcmHookPath();
      const createdByCrow = await isCmtHookCreatedByCrow();
      if (fs.existsSync(gitPcmHookPath) && createdByCrow) {
        fs.removeSync(gitPcmHookPath);
        console.log(`GitHooks取消同步: ${gitPcmHookPath}`);

        if (fs.existsSync(`${gitPcmHookPath}.bak`)) {
          fs.renameSync(`${gitPcmHookPath}.bak`, gitPcmHookPath);
        }
      }
    }
  } catch (err) {
    throw new Error(err);
  }
};

// 同步生成函数到git
const syncGenerateFuncToGit = async () => {
  try {
    const isGitRepo = await checkGitRepo();
    if (isGitRepo) {
      const gitPcmHookPath = await getGitPcmHookPath();

      // 如果已经有prepare-commit-msg文件，且不是crow-cli生成的，则备份
      const createdByCrow = await isCmtHookCreatedByCrow();
      if (fs.existsSync(gitPcmHookPath) && !createdByCrow) {
        fs.renameSync(gitPcmHookPath, `${gitPcmHookPath}.bak`);
      }

      // 复制prepare-commit-msg文件到git hooks目录
      fs.copySync(
        path.join(getRootFile('crow-cli'), 'githooks/prepare-commit-msg'),
        gitPcmHookPath,
      );

      await execSync(`chmod +x ${gitPcmHookPath}`);
      console.log(`GitHooks同步成功: ${gitPcmHookPath}`);
    }
  } catch (err) {
    throw new Error(err);
  }
};

const action = async (cmdArgs: any) => {
  try {
    if (cmdArgs.sync) {
      await syncGenerateFuncToGit();
    }

    if (cmdArgs.unsync) {
      await cancelSyncGenerateFuncToGit();
    }

    if (cmdArgs.checksync) {
      const isCreatedByCrow = await isCmtHookCreatedByCrow();
      if (isCreatedByCrow) {
        console.log(true);
      } else {
        console.log(false);
      }
    }
  } catch (err) {
    throw new Error(err);
  }
};

export default {
  options: [
    [
      '--checksync',
      'verify whether the prepare-commit-msg file was created by Crow-CLI.',
    ],
    [
      '--sync',
      'synchronize the commit generation function with Git, which will override the prepare-commit-msg Git hook file.',
    ],
    [
      '--unsync',
      'cancel the synchronization of the commit generation function with Git. This will rename the prepare-commit-msg Git hook file to prepare-commit-msg.bak.',
    ],
  ],
  action,
};
