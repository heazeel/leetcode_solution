export const EXTENSION_ID = 'chaoshi-f2e-team.crow';
export const USER_TOKEN_KEY = 'crowCopilot.userToken';
export const CHAT_MODE_KEY = 'chatMode';
export const USER_TOKEN_CONTEXT_KEY = 'userToken';
export const FREE_CHAT_API = 'https://test.com/v1/chat';
export const CODE_CHAT_API_HOST_PRE = 'https://test.com/';
export const CODE_CHAT_API_HOST_PROD = 'https://test.com/';
export const CODE_CHAT_API_PATH = 'api/chaoshi/mod';
export const CROW_LOGIN = 'isLogin';
export const CROW_USER_INFO = 'crowUserInfo';
export const CROW_SCM_COMMIT_MSG_GENERATING = 'crowCopilot.commitMsgGenerating';
export const CROW_CLI_SYNC_KEY = 'crowCopilot.syncGitPrepareCommitMsg';
export const CROW_CLI_SYNC_STATUS = 'crowcliSyncStatus';
export const CROW_PLAYER_STATUS = 'crowPlayerStatus';
export const CROW_WHITE_LIST = ['077913', '229992', '394858', '391453'];

// 补全接口
export const COMPLETION_API = 'https://test.com/v1/completion';

export const ALIBABA_API_KEY = 'sk-35a9d91648fa40b6b8b6dc7aec566ea2';

// devMind接口
export const CODE_CHAT_CREATE_SESSION_PATH = 'api/session';
export const CODE_CHAT_GET_SESSION_PATH = 'api/session/:session_id';
export const CODE_CHAT_SESSION_ASK_PATH = 'api/session/:session_id/ask';
export const CODE_CHAT_SESSION_TELL_PATH = 'api/session/:session_id/tell';

export const USER_INFO_KEY = 'crowCopilotUserInfo';

export const enum Schemes {
  ReadOnly = 'crow-readonly',
  Commit = 'crow-commit',
  Terminal = 'crow-terminal',
}

// commit工具
export const enum CommitCommands {
  SourceMenuCommit = 'sourceMenuCommit',
  StatusBarCommit = 'statusBarCommit',
  TerminalCommit = 'terminalCommit',
}

export const enum CrowCliStatus {
  waitLoad = 'waitLoad',
  loading = 'loading',
  loadFail = 'loadFail',
  normal = 'normal',
}

export const FollowUpQuestionPrompt = `角色: 你是一位出色的人工智能 copilot提问专家，擅长站在人类的角度向人工智能 copilot 提出问题。

职能&任务：你的任务是根据给定的上下文信息以及人类用户目前提出的问题({question})，精心制定3个更有深度的追问（注意你发问的对象是人工智能，没有情感和个人经历）。确保这些追问能够紧密联系用户的原始问题，同时避免问题无实际意义、错误、过于简单或重复，你应该借助下面给你提供的工具来帮助你完成任务。

工具: 这里有提供给你使用的工具，你需要根据提问的问题判断选择使用下面给出的哪些工具，并按照特定格式作为追问结果中的一条进行回复：
1.** /explain: 解释代码，当用户的提问中有js、ts、css等具体的代码片段让你进行解释时，你应该使用该工具，回复格式是\`/explain: {question}\`。
2.** /fix: 修复代码，当用户的提问中包含js、ts、css等一些具体的代码片段或者这段代码有一些明显的逻辑错误或者用户的问题中带有明显的困惑时，你需要使用该工具，回复格式是\`/fix: {question}\`.
3.** @DeveloperAssistant: 私域答疑，当问题中包含\`spm\`或者\`埋点\`或者\`鸿雁\`或者\`模块创建\`或者\`Arms告警\`或者\`黄金令箭\`或者\`ald（阿拉丁）\`相关问题时，你必须使用该工具，回复格式是\`@DeveloperAssistant: {question}\`。
4.** @RealTimeSearch: 实时搜索，当有一些技术性问题或者实时性问题时，你必须使用该工具。当上面所有工具都没有满足使用条件时，你必须使用该工具，回复格式是\`@RealTimeSearch: {question}\`。 

追加注意内容：请用中文提出这些问题，并以json数组的格式返回，字段名设为questions，必须遵循返回示例中的格式，生成追问问题前一定要先使用上面提供的工具，请注意遵循以下标准：
1. 相关性:每个问题都必须直接与用户的原问题有关，以确保对话的连贯性和针对性。
2. 避免无效提问：确保每个问题都具有深度，避免提出无意义、错误、过于简单或重复的问题。
3. 中文描述：问题描述需使用准确清晰的中文。 
4. 输出格式：请以json数组的形式输出最终问题列表，必须遵循返回示例中的格式 
5. 确保给出的追问问题能够让人类更好的找到原始问题的答案
6. 必须满足追问问题的视角是以人类的角度向copilot发出提问！
7. 必须使用上述提供给你的工具并在返回结果中体现

基于以上内容，综合用户当前问题"{question}"，结合工具使用，请提出3个相关、有深度的、有意义的追问。 
返回示例： \`\`\`json \n{ \n  "questions": [\n"问题1" \n"问题2", \n"使用工具后的返回格式" \n ] \n} \n \`\`\` 
清注意，上述返回示例中，questions的value必须为字符串数组，注意！追问问题的视角是以人类的角度向copilot发出提问，注意主语和第一人称的使用`;
