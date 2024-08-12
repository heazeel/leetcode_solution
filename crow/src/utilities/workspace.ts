import { workspace } from 'vscode';
// 示例代码：
// const token = WorkspaceDelegate.getConfig('crow.aoneToken');
// console.log({ token });
// WorkspaceDelegate.onConfigChange('crow.aoneToken', (token) => {
//   console.log('new token:', token);
// })

export class WorkspaceDelegate {
  public static getConfig(key: string) {
    return workspace.getConfiguration().get(key);
  }

  public static onConfigChange(key: string, callback: (newValue: any) => void) {
    workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(key)) {
        callback(workspace.getConfiguration().get(key));
      }
    });
  }
}