import { Range, window, CodeLens, commands, workspace, Selection } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import { createRange } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';
import eventEmitter from '../../../utilities/events';

const fixPrompt: string = `
从现在开始，你是一位优秀的软件工程师，你需要对我提供的代码进行优化或者修复，代码可能存在以下问题，你需要按照对应的优化方案对代码进进行优化：
1. 缺乏一致性：代码中使用不一致的缩进、命名风格、代码注释等，使得代码难以阅读和维护。优化方案：统一的代码风格规范。
2. 变量和函数命名不清晰：使用没有意义或者太过简单的变量和函数名，无法清晰地表达其用途。优化方案：使用有意义的命名，避免使用缩写或者单字母变量，使得代码更易读。
3. 长方法和函数：过长的方法和函数增加了代码的复杂性，难以理解和测试。优化方案：将长方法和函数拆分成多个小的、单一职责的函数，提高代码的可读性和可维护性。
4. 注释不足或者错误：缺乏注释或者注释与代码不一致，无法理解代码的用途和实现细节。优化方案：为代码添加清晰的注释，解释代码的意图和实现逻辑，方便他人阅读和维护代码，注释需要是中文。
5. 不合理的代码布局：代码缺乏良好的排版和布局，使得代码难以理解和浏览。优化方案：使用适当的缩进、空行和代码块，使得代码结构清晰，易于阅读和维护。
6. 过多的重复代码：代码中存在大量重复的代码段，增加了代码冗余，并且修改起来复杂。优化方案：提取重复的代码段为函数或者类，减少代码冗余，提高代码的可维护性。
7. 没有错误处理机制：代码未考虑异常情况，没有适当的错误处理机制，导致程序容易崩溃或者出现不可预料的错误。优化方案：为代码添加适当的错误处理，捕获异常并进行相应的处理，增加代码的健壮性。
8. 没有做空值判断：使用变量时未考虑变量值为null、undefined等情况，导致程序容易崩溃或者出现不可预料的错误，优化方案：为代码添加适当的空值判断和错误处理，捕获异常并进行相应的处理，增加代码的健壮性。
9. 代码存在可能的逻辑错误或者bug：导致程序出现报错或者出现不可预料的错误。优化方案：修复代码中的逻辑错误或者bug，增加代码的健壮性。
10.当你发现了代码的逻辑错误或者bug时，你需要在回答中指出问题，并解释这样修改的原因。

切记！！！我会提供给你两段代码，一段是当前所在文件的所有代码，一段是需要进行修复的代码片段，你在回复的时候，只需回复提供给你的进行修复的代码片段！只需回复提供给你的进行修复的代码片段！只需回复提供给你的进行修复的代码片段！当前所在文件的所有代码是提供给你理解用的，不要更改和回复多余的内容!!!
请你按上面提供的优化方案，对提供给你的需要进行修复的代码片段进行优化，你优化后的代码不能有上面提出的问题
所有代码：
{allcode}
进行修复的代码片段： 
{fixcode}
`;

export default class FixCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = '_crowCopilot.codeLens.fix';

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
          key: 'fix',
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
      title: '修复',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
