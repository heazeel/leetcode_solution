import { window, workspace, Uri } from 'vscode';
import { Register } from './base';
import { TextEditorDelegate } from '../utilities/editor';

type Method =
  | 'getSelectedText'
  | 'getCursorPrefixText'
  | 'getCursorSuffixText'
  | 'replaceSelectedText'
  | 'insertText'
  | 'insertTextBeforePreview'
  | 'insertCode';

export interface CallParameter {
  method: Method;
  text?: string;
  dumb?: boolean;
  path?: string;
}

export default class TextEditorRegister extends Register<CallParameter> {
  public messageName = 'textEditor';

  public async handleContent(content: CallParameter) {
    const { method, text, dumb, path } = content;
    const editor = window.activeTextEditor;
    if (!editor) {
      // 静默
      !dumb && window.showInformationMessage('未打开可用文本编辑器');
      return;
    }

    const workspacePath = workspace.workspaceFolders?.[0].uri.path;
    const filePath = editor.document.uri.path.replace(`${workspacePath}/`, '');
    const language = editor.document.languageId;

    let result: any;
    let needPostMessage = false;

    if (method === 'getSelectedText') {
      result = TextEditorDelegate.getSelectedText(editor);
      needPostMessage = true;
    } else if (method === 'getCursorPrefixText') {
      result = TextEditorDelegate.getCursorPrefixText(editor);
      needPostMessage = true;
    } else if (method === 'getCursorSuffixText') {
      result = TextEditorDelegate.getCursorSuffixText(editor);
      needPostMessage = true;
    } else if (method === 'replaceSelectedText' && text) {
      TextEditorDelegate.replaceSelectedText(editor, text).then((success) => {
        if (!success) {
          window.showErrorMessage('文本替换错误');
        }
      });
    } else if (method === 'insertText' && text) {
      TextEditorDelegate.insertText(editor, text).then((success) => {
        if (!success) {
          window.showErrorMessage('插入文本错误');
        }
      });
    } else if (method === 'insertTextBeforePreview' && text) {
      TextEditorDelegate.insertTextBeforePreview(editor, text);
    }
    if (needPostMessage) {
      this.delegate.postMessage(this.messageName, {
        method,
        result,
        language,
        filePath,
        selection: editor.selection,
      });
    }
  }
}
