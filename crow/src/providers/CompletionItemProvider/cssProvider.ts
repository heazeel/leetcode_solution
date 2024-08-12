import {
  CancellationToken,
  CompletionContext,
  Position,
  TextDocument,
  CompletionItem,
  CompletionItemProvider,
  CompletionList,
  ProviderResult,
  CompletionItemKind,
} from 'vscode';
import { getFilename, getClassNames } from './utils';

export default class CssCompletionItemProvider implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext,
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    const cssCompletion: CompletionItem[] = [];
    try {
      const filesPath = getFilename();
      const classNames = getClassNames(filesPath);
      classNames.map((className: string) => {
        const item = new CompletionItem(`.${className}`);
        item.kind = CompletionItemKind.Keyword;
        item.insertText = `.${className}`;
        cssCompletion.push(item);
      });
    } catch (err) {
      console.log(err);
    }
    return [...cssCompletion];
  }
}
