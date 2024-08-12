// 示例代码
import {
  CodeLensProvider,
  CodeLens,
  EventEmitter,
  Event,
  workspace,
  TextDocument,
  CancellationToken,
  Position,
} from 'vscode';

export class CrowCodelensProvider implements CodeLensProvider {

  private codeLenses: CodeLens[] = [];
  private regex: RegExp;
  private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
  public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    this.regex = /Hello/ig;

    workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
    if (workspace.getConfiguration('crowCopilot').get('enableHelloCodeLens', true)) {
      this.codeLenses = [];
      const regex = new RegExp(this.regex);
      const text = document.getText();
      let matches;
      while ((matches = regex.exec(text)) !== null) {
        const line = document.lineAt(document.positionAt(matches.index).line);
        const indexOf = line.text.indexOf(matches[0]);
        const position = new Position(line.lineNumber, indexOf);
        const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
        if (range) {
          this.codeLenses.push(new CodeLens(range));
        }
      }
      return this.codeLenses;
    }
    return [];
  }

  public resolveCodeLens(codeLens: CodeLens, token: CancellationToken) {
    if (workspace.getConfiguration('crowCopilot').get('enableHelloCodeLens', true)) {
      codeLens.command = {
        title: 'Hi~🤖',
        tooltip: 'Woo! click me.',
        command: 'crowCopilot.openUserManual',
        // arguments: ['Argument 1', false]
      };
      return codeLens;
    }
    return null;
  }
}
