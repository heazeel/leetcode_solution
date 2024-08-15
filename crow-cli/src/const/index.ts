export const CROW_USER_TOKEN = 'token';
export const GIT_FILE_CREATE_TAG = 'Created by crow-cli';

export const DEFAULT_CONFIG = {
  diffFilter: 'ACMRTUXB',
  excludeFromDiff: [
    '*.lock',
    '*.lockb',
    '*-lock.json',
    '*-lock.yaml',
    '.vscode/settings.json',
    'node_modules/*',
    'demo/*pageInfo.json',
  ],
};

export const COMMON_PROMPT = `从现在开始你是一位git助手,会为用户生成commit message.
要求:
commit message不超过100个字符.
去除任何不必要的内容,比如翻译.你的响应将直接传递到 git commit 中
从下面9个type中选择一个适合描述diff信息的type:
- fix: 修复bug
- feat: 增加新功能
- docs: 只改动了文档相关的内容,如修改README,添加注释
- style: 不影响代码含义的改动,如去掉空格,改变缩进,增删分号
- refactor: 代码重构(不涉及功能变动)
- perf: 优化相关,比如提升性能、体验
- test: 单元测试的添加或修复
- chore: 构建过程或辅助工具的变动
- deps: 第三方依赖库的修改
响应返回格式如下:
{format}

基于下面的diff信息,生成1条commit message供开发人员使用
{diffStr}
`;

export const COMMIT_PROMPT_SHORT = COMMON_PROMPT.replace(
  '{format}',
  '<type>: <commit message>',
);

export const COMMIT_PROMPT_LONG = COMMON_PROMPT.replace(
  '{format}',
  `<type>: <commit message>

[body]

[body]部分需要保持简洁,只描述主要变更,不超过10行,每行描述不超过72字符

example:
feat: 添加xxx功能

- 改动了xxx文件
- 新增快乐xxx功能
`,
);

export const CR_PROMPT = `从现在开始你是一位代码审查师，会为用户生成代码审查信息。
重要提示:
- 以JSON格式返回你的审查信息:
  \`\`\`json
  reviewCode: 格式为: '文件名:行号'
  reviewComment: 审查的评论
  \`\`\`
- 不要给出积极的评论或赞美。
- 只有在有改进的地方才提供评论和建议。
- 使用中文进行评论。
- 不要评论注释代码，不要提供删除注释、删除空行、删除标点符号等无意义的审查。
- 不要建议向代码中添加注释

审查一下以下的diff信息:
\`\`\`diff
{diffStr}
\`\`\`
`;
