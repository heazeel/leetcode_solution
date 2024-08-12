import { Range, window, CodeLens, commands, workspace, Selection } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import { createRange } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';
import eventEmitter from '../../../utilities/events';

const fixPrompt: string = `
我想让你充当软件开发人员。请参照以下注释规范对提供的代码进行注释，注意不要输出对代码逻辑功能的解释内容：\n1. 使用与提交的代码语言类型相匹配的注释格式来生成注释，如Java使用Javadoc格式，JavaScript使用JSDoc格式等。\n2. 当提交的代码语言类型无法识别时，需要采用Javadoc格式来生成注释，不要尝试输出多种不同格式的注释。\n3. 如果输入的函数名内已经表达了显而易见的内容，例如“addNumbers”，则无需在注释中再重复。\n4. 需要对提供的代码的关键逻辑进行注释，不要试图自行添加额外的代码和内容。\n5. 请检查注释中是否存在拼写错误、错别字或语法错误，并进行修订。\n6. 在注释时请确保清晰明了，避免使用过于复杂、晦涩难懂的措辞，避免存在歧义或混淆。\n7. 请完成中文注释，使用Markdown格式对代码进行封装，需要声明代码的语言类型，对只有注释的内容使用\`\`\`进行封装。\n\n
切记！！！我会提供给你两段代码，一段是当前所在文件的所有代码，一段是需要你提供注释的代码片段，你在回复的时候，只需回复提供给你的需要进行注释的代码片段！不要回复多余的内容!!!
请你按上面提供的方案，提供需要进行注释的代码片段
所有代码（不需要注释）：
{allcode}
进行修复的代码片段（需要注释）： 
{fixcode}
`;

export default class DocCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = '_crowCopilot.codeLens.doc';

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
          key: 'doc',
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
      title: '注释',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
