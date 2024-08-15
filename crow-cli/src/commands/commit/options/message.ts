import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import cp from 'child_process';
import { COMMIT_PROMPT_SHORT, COMMIT_PROMPT_LONG } from '../../../const';
import spinner from '../../../helpers/spinner';
import Request from '../../../helpers/request';
import record from '../../../helpers/record';
import {
  checkGitRepo,
  childProcessExec as execSync,
  getInnermostErrorMessage,
} from '../../../utils';

const excludeFromDiffInfo = [
  '*.lock',
  '*.lockb',
  '*-lock.json',
  '*-lock.yaml',
  'demo/*',
  'mock/*',
  'node_modules/*',
  '.vscode/settings.json',
];

const parseGitDiffShortstat = (
  shortstat: string,
): { filesChanged: number; insertions: number; deletions: number } => {
  const match = shortstat.match(
    /(\d+) file(?:s)? changed, (\d+) insertion(?:s)?\(\+\), (\d+) deletion(?:s)?\(-\)/,
  );
  return {
    filesChanged: match ? parseInt(match[1]) : 0,
    insertions: match ? parseInt(match[2]) : 0,
    deletions: match ? parseInt(match[3]) : 0,
  };
};

// 获取diff信息
const getGitDiffInfo = async (
  useUnStaged = false,
): Promise<{
  diffStr: string;
  filesChanged: number;
  linesChanged: number;
}> => {
  const prefix = 'git diff';
  const changes = 'git diff --shortstat';

  const staged = useUnStaged ? '' : '--staged';

  const excludeFromDiff = excludeFromDiffInfo
    .map((pattern) => `':(exclude)${pattern}'`)
    .join(' ');

  const suffix = `${staged} --no-ext-diff --minimal --ignore-space-change \
  --diff-filter=ACMRTUXB \
  -- ${excludeFromDiff}`;

  try {
    const config: cp.CommonExecOptions = {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    };

    const fileChanges = await execSync(`${changes} ${suffix}`, config);
    const { filesChanged, insertions, deletions } =
      parseGitDiffShortstat(fileChanges);

    const stdout = await execSync(`${prefix} ${suffix}`, config);
    if (stdout) {
      return {
        diffStr: stdout,
        filesChanged,
        linesChanged: insertions + deletions,
      };
    }

    throw new Error(
      `the following files will be ignored during generating:

${chalk.yellow(excludeFromDiffInfo.join('\n'))}

no files to commit after ignoring.`,
    );
  } catch (error) {
    throw new Error(error);
  }
};

const generate = async ({ onlyMsg, unstaged, from }) => {
  const { COMMIT_FROM = from || 'crow-cli', COMMIT_ONLY_MSG = onlyMsg } =
    process.env;

  try {
    if (!Boolean(COMMIT_ONLY_MSG)) {
      spinner.start('Generating commit message...');
    }

    const isGitRepo = await checkGitRepo();
    if (!isGitRepo) return;

    let diffInfo = await getGitDiffInfo(unstaged);
    let { diffStr, filesChanged, linesChanged } = diffInfo || {};
    diffStr = diffStr.replace(/(diff --git .*\n)/g, '\n$1');

    // 选择commit信息模板
    const commitPrompt =
      filesChanged > 5 && linesChanged > 300
        ? COMMIT_PROMPT_LONG
        : COMMIT_PROMPT_SHORT;

    const tokenizePrompt = commitPrompt.replace('{diffStr}', diffStr);
    const qwenTurboTokenSize =
      await Request.requestTongyiTokenizer(tokenizePrompt);

    let useLongContext = false;
    if (qwenTurboTokenSize > 6000) {
      useLongContext = true;
      const qwenPlusTokenSize = await Request.requestTongyiTokenizer(
        tokenizePrompt,
        'qwen-plus',
      );
      if (qwenPlusTokenSize > 30000) {
        throw new Error(
          'diff tokens exceeds the maximum limit, please commit manually.',
        );
      }
    }

    // 使用tongyi生成commit信息;
    let commitMsg = await Request.requestTongyi(
      commitPrompt,
      { diffStr },
      useLongContext,
    );
    commitMsg = commitMsg.trim().replace(/^"|"$/g, '');

    /**
     * 只生成commit信息，不进行后续的提交操作
     * 主要是为vscode插件提供信息，提交操作由插件自行处理
     */
    if (Boolean(COMMIT_ONLY_MSG)) {
      console.log(`${commitMsg.trim()}`);
      return;
    }

    spinner.stopAndPersist(`\n${chalk.green(commitMsg)}\n`);

    record.trace.logCustom({
      p1: 'commitMsg',
      c1: COMMIT_FROM,
      c2: 'generate_success',
      c3: process.cwd(),
      c4: commitMsg,
    });

    const answer = await select({
      message: 'Choose your operation:',
      choices: [
        { name: 'Commit', value: 1 },
        { name: 'Commit (--no-verify)', value: 2 },
        { name: 'Regenerate', value: 3 },
        { name: 'Exit', value: 4 },
      ],
    });

    if (answer) {
      if (answer === 1 || answer === 2) {
        record.trace.logCustom({
          p1: 'commitMsg',
          c1: COMMIT_FROM,
          c2: 'accept_msg',
          c3: process.cwd(),
          c4: commitMsg,
        });

        const command = [
          `${unstaged ? 'git add .' : ''}`,
          `git commit -m '${commitMsg}' ${answer === 2 ? '--no-verify' : ''}`,
        ]
          .filter(Boolean)
          .join(' && ');

        // console.log(command);
        const stdout = await execSync(`${command}`, {
          cwd: process.cwd(),
          encoding: 'utf8',
        });
        console.log(`\n${stdout}`);
      } else if (answer === 3) {
        await generate({ onlyMsg, unstaged, from });
      }

      // const stdout = await execSync(`${command}`, {
      //   cwd: process.cwd(),
      //   encoding: 'utf8',
      // });
      // console.log(`\n${stdout}`);
    }
  } catch (err) {
    const msg = getInnermostErrorMessage(err);
    record.trace.logCustom({
      p1: 'commitMsg',
      c1: COMMIT_FROM,
      c2: 'generate_fail',
      c3: process.cwd(),
      c4: msg,
    });

    if (msg?.includes('timeout')) {
      throw new Error('generating message timed out, please try again.');
    }

    throw new Error(msg);
  }
};

const action = async (cmdArgs: any) => {
  try {
    if (cmdArgs.message) {
      const { onlyMsg, unstaged, from } = cmdArgs;
      await generate({
        onlyMsg: onlyMsg || false,
        unstaged: unstaged || false,
        from,
      });
    }
  } catch (err) {
    throw new Error(err);
  }
};

export default {
  options: [
    ['-m, --message', 'generate commit message.'],
    [
      '--only-msg',
      'generate commit message only, without guiding the commit process.',
    ],
    [
      '--unstaged',
      'commit unstaged files. By default, only staged files are committed.',
    ],
    ['--from <from>', 'command from which the entry originates.'],
  ],
  action,
};
