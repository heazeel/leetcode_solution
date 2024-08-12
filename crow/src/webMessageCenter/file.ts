import { workspace } from 'vscode';
import { Register } from './base';
import { FileHelper } from '../utilities/file';

type Method =
  | 'writeFile'
  | 'getWorkspaceFolders'
  | 'addFolderToWorkspace'
  | 'readFile'
  | 'createTempFilePreview'
  | 'createTempReadOnlyFilePreview';

export interface CallParameter {
  method: Method;
  fsPath?: string;
  text?: string;
}

export default class FileRegister extends Register<CallParameter> {
  public messageName = 'file';

  public async handleContent(content: CallParameter) {
    const { method, fsPath, text } = content;
    if (method === 'writeFile' && fsPath && text) {
      FileHelper.writeFile(fsPath, text);
    }
    // 获取当前工作区文件夹
    if (method === 'getWorkspaceFolders') {
      const workspaceFolders = workspace.workspaceFolders;
      this.delegate.postMessage('getWorkspaceFoldersSuccess', { content: workspaceFolders });
    }
    // 往工作区添加文件夹
    if (method === 'addFolderToWorkspace') {
      const folder = await FileHelper.selectWorkspaceFolder();
      this.delegate.postMessage('addFolderToWorkspaceSuccess', { content: folder });
    }
    // 读文件
    if (method === 'readFile' && fsPath) {
      const fileContent = await FileHelper.readFile(fsPath);
      this.delegate.postMessage('readFileSuccess', { content: fileContent });
    }

    // 创建临时文件预览
    if (method === 'createTempFilePreview' && fsPath && text) {
      FileHelper.createTempFilePreview(fsPath, text);
    }

    // 创建临时只读文件预览
    if (method === 'createTempReadOnlyFilePreview' && fsPath && text) {
      FileHelper.createTempReadOnlyFilePreview(fsPath, text);
    }
  }
}
