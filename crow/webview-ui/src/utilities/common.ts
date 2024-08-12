type keyEventType = {
  id: string;
  eventType: 'EXP' | 'CLK' | 'SLD' | 'INPUT' | 'SYS' | 'OTHER';
  success: boolean;
  time?: number;
};

type CustomDataType = {
  p1: string;
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;
  c6?: string;
  c7?: string;
  c8?: string;
  c9?: string;
  c10?: string;
};

type codeLogDataType = {
  page: string;
  operator: string;
  eventType: 'EXP' | 'CLK' | 'SLD' | 'INPUT' | 'SYS' | 'OTHER';
  extData?: {
    [key: string]: string;
  };
};

export function LogKeyEvent(data: keyEventType): void {
  if (!window.crow_trace) {
    return;
  }

  const trace = window.crow_trace;
  trace.logEvent(data);
}

export const isTrue = (flag: any): boolean =>
  !!(flag === true || flag === 'true' || flag === '1' || flag === 1);

export function sendPv(data: { page: string }): void {
  if (!window.crow_trace) {
    return;
  }

  const trace = window.crow_trace;
  trace.logPv({
    c1: data.page,
  });
}

// 生成UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const getDataTime = () => {
  let date = new Date();

  let year = date.getFullYear();
  let month = ('0' + (date.getMonth() + 1)).slice(-2);
  let day = ('0' + date.getDate()).slice(-2);
  let hours = ('0' + date.getHours()).slice(-2);
  let minutes = ('0' + date.getMinutes()).slice(-2);
  let seconds = ('0' + date.getSeconds()).slice(-2);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const getTimestamp = () => {
  let date = new Date();
  return date.getTime().toString();
};

export function logCustomEvent(data: CustomDataType): void {
  if (!window.crow_trace) {
    return;
  }
  const trace = window.crow_trace;
  trace.logCustom(data);
}

// 代码块快捷操作上报
export function logCode(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'code',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 整段回答操作上报
export function logAnswer(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'answer',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 浮层按钮功能上报
export function logFloat(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'float',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
  });
}

export function logFollowUp(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'followUp',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 快捷prompt功能上报
export function logPrompt(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'prompt',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 快捷prompt功能上报
export function logCustomPrompt(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'customPrompt',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 同步prompt工厂上报
export function logSyncPromptFactory(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'syncPromptFactory',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
  });
}
// 开启&关闭实时搜索上报
export function logEnableTbStarSearch(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'enableTbStarSearch',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
  });
}

// 实时搜索参考资料点击上报
export function logClkTbStarUrl(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'clickTbStarUrl',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 展开&还原 实时搜索参考资料上报
export function logClkTbStarExpand(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'expandTbStarReferences',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
  });
}

// 提问submit上报
export function logSubmit(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'submit',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

export function logMentions(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'mentions',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
    c4: JSON.stringify(data.extData),
  });
}

// 停止回答上报
export function logStop(data: codeLogDataType): void {
  return logCustomEvent({
    p1: 'stop',
    c1: data.page,
    c2: data.operator,
    c3: data.eventType,
  });
}

export function logDevMind(data: {
  sessionId: string;
  taskType?: string;
  target?: string;
  executeStatus?: string;
  content?: string; // 自然语言描述
  fixOpinions?: { filename: string; requirement: string }[]; // 修改内容
}): void {
  const { sessionId, taskType, target, executeStatus, content, fixOpinions } = data;
  return logCustomEvent({
    p1: 'devmind',
    c1: sessionId,
    c2: executeStatus || '',
    c3: taskType || '',
    c4: target || '',
    c5: content || '',
    c6: fixOpinions?.length ? JSON.stringify(fixOpinions) : '',
  });
}

export function validateFollowUpQestion(content: string[]) {
  let valid = true;
  if (!Array.isArray(content)) return false;
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (typeof item !== 'string') {
      valid = false;
      break;
    }
  }
  return valid;
}
