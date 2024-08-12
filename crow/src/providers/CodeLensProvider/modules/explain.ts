import { Range, window, CodeLens, commands, workspace, Selection } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import { createRange } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';
import eventEmitter from '../../../utilities/events';

const fixPrompt: string = `
从现在开始，你是一位优秀的软件工程师，你需要对我提供的代码进行解释：
切记！！！我会提供给你两段代码，一段是当前所在文件的所有代码，一段是当前所在文件内需要进行解释的代码片段，你在回复的时候，只需回复“进行解释的代码片段”部分！不要回复多余的内容!!!
请你按上面提供的方案，对提供给你的代码片段进行解释：
所有代码（不需要解释）：
{allcode}
进行修复的代码片段（需要解释）： 
{fixcode}
`;

export default class ExplainCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = '_crowCopilot.codeLens.explain';

  public commandHandler(range: Range) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    // 确定要添加属性的code的范围
    const allCode = editor.document.getText();
    const code = editor.document.getText(range);
    const workspacePath = workspace.workspaceFolders?.[0].uri.path;
    const filePath = editor.document.uri.path.replace(`${workspacePath}/`, '');
    const language = editor.document.languageId;
    const prefix = `${language} ${filePath} ${range.start.line}-${range.end.line}`;
    const showText = `\`\`\`${prefix}\n${code}\n\`\`\``;
    const prompt = fixPrompt.replace('{allcode}', allCode).replace('{fixcode}', code);

    // 设置编辑器的选中态
    editor.selection = new Selection(range.start, range.end);

    commands.executeCommand('crowCopilot.activate').then(() => {
      eventEmitter.emit('message', {
        type: 'shortcut',
        content: {
          method: 'codeLenFormatPrompt',
          key: 'explain',
          params: {
            showText,
            prompt,
          },
        },
      });
    });
  }

  public provide(path: NodePath) {
    const codeLenses: CodeLens[] = [];
    const { loc } = path.node as any;

    try {
      const range = createRange(loc!);
      const codeLens = new CodeLens(range);
      codeLenses.push(codeLens);
      return codeLenses;
    } catch (error) {
      return [];
    }
  }

  public resolve(codeLens: CodeLens) {
    codeLens.command = {
      title: '解释',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
