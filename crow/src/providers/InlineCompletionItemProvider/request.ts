import path from 'path';
import { ExtensionContext, TextDocument, workspace, Position, Range, version } from 'vscode';
import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { execSync } from 'child_process';
import { COMPLETION_API, USER_TOKEN_CONTEXT_KEY } from '../../constants';

function getUserToken(context: ExtensionContext) {
  return context.globalState.get<string>(USER_TOKEN_CONTEXT_KEY);
}

export function getFilePath(document: TextDocument) {
  const workspacePath = workspace.workspaceFolders?.[0].uri.path;
  if (workspacePath) {
    return path.relative(workspacePath, document.uri.fsPath);
  }
}

export function getCursorText(document: TextDocument, position: Position) {
  const textBeforeCursor = document.getText(new Range(new Position(0, 0), position));
  const endLine = document.lineCount - 1;
  const endCharacter = document.lineAt(endLine).text.length;
  const textAfterCursor = document.getText(
    new Range(position, new Position(endLine, endCharacter)),
  );
  return [textBeforeCursor, textAfterCursor];
}

// https://aliyuque.antfin.com/copilot/userguide/gin0pddq3wx91hoz?singleDoc#jnGY8
interface Result {
  amount: number;
  choices: { text: string }[];
}

export default class CompletionRequestClient {
  public cancelTokenSource: CancelTokenSource | null = null;
  constructor(readonly context: ExtensionContext) {}

  async request({
    filePath,
    prompt,
    suffix,
  }: {
    filePath: string;
    prompt: string;
    suffix: string;
  }) {
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('Canceled due to new request');
    }
    this.cancelTokenSource = axios.CancelToken.source();

    const userToken = getUserToken(this.context);
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Plugin-Version': `crow+v${this.context.extension.packageJSON.version}`,
        'x-client-type': 'vscode',
        'x-client-version': version,
      },
      method: 'post',
      url: COMPLETION_API,
      cancelToken: this.cancelTokenSource?.token,
      data: {
        file_path: filePath,
        prompt,
        suffix,
      },
    };

    return axios<Result>(config);
  }
}
