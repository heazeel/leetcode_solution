import React from 'react';
export enum ChatMode {
  DevMind = 'devMind',
  Free = 'free',
}

export enum TBStartMode {
  // GPT模型
  GPT = 'GPT',
  // 集团内部模型
  Group = 'Group',
}

export interface ISubmitData {
  value: string;
  extra?: any;
  originList?: any[];
  useRTSearch?: boolean;
  resDataType?: string;
  prefix?: string[];
  updateFollowUpQestion?: boolean;
}

export interface ISession {
  label: string;
  key: string;
  children: React.ReactNode;
  closable: boolean;
}

export enum ChatItemType {
  Ask = 'ask',
  Answer = 'answer',
}

export type ListItemType = ChatItemType.Ask | ChatItemType.Answer;

export interface CHAT_ERROR {
  message: string;
  code?: string;
}

export interface CHAT_ID {
  [propName: string]: string;
}

export interface CHAT_CONTENT {
  id: string;
  finishReason?: string;
  content: string;
  resDataType?: string;
  abstractInfo?: any;
  followUpQuestion?: string;
  [propName: string]: any;
  error?: CHAT_ERROR;
}

export interface FreeChatRequest {
  prompt: string;
  needAppend: boolean;
  lastMessageIds?: number[];
}

export interface DevMindRequest {
  prompt: string;
  lastMessageIds?: number[];
}

export interface FreeChatResponse {
  finishReason?: any;
  id: string;
  content: string;
}

export interface DevMindCodeResponse {
  done: boolean;
  filename: string;
  delta: string;
}

export interface PreprocessFunc {
  (content: string): string;
}

export interface QuickOpeartionType {
  name: string;
  description: string;
  key: string;
  show: boolean;
  prefix: string;
  contentFilter?: PreprocessFunc;
}

export interface UserInfoProps {
  workId: string;
  userNick: string;
  [propName: string]: any;
}
export interface ContextProps {
  userInfo?: UserInfoProps;
  [propName: string]: any;
}
