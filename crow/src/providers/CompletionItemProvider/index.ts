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
  MarkdownString,
  Uri,
} from 'vscode';

import { getDependencies } from './utils';

export default class CrowCompletionItemProvider implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext,
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    const commitCharacterCompletion = new CompletionItem('WindVane');
    commitCharacterCompletion.commitCharacters = ['.'];
    const doc = new MarkdownString(
      '确保当前在`手淘`或者`手猫`环境中，相关文档[link](WindVane-API.html)',
    );
    doc.baseUri = Uri.parse('https://test.com/api/');
    commitCharacterCompletion.documentation = doc;

    const commandCompletion = new CompletionItem('crow help');
    commandCompletion.kind = CompletionItemKind.Keyword;
    commandCompletion.insertText = '';
    commandCompletion.command = {
      command: 'crowCopilot.openUserManual',
      title: '打开用户手册',
    };

    // 依赖信息补全
    const packagesCompletion: CompletionItem[] = [];
    try {
      const dependencies = getDependencies() || [];
      dependencies.map((dependency) => {
        const { name, dependence } = dependency;
        const item = new CompletionItem(`import ${dependence}`);
        item.kind = CompletionItemKind.Keyword;
        item.insertText = `import ${name} from '${dependence}';`;
        packagesCompletion.push(item);
      });
    } catch (err) {
      console.log(err);
    }

    return [commitCharacterCompletion, commandCompletion, ...packagesCompletion];
  }
}
