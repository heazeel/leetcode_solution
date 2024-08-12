import { Position, window, workspace, Range, TextDocument } from 'vscode';
import tokenizer from './tokenizer';

export default class CodeMatcher {
  public isLanguageMatched(id1: string, id2: string) {
    if (id1 === id2) {
      return true;
    }
    if (
      (id1 === 'javascript' || id1 === 'javascriptreact') &&
      (id2 === 'javascript' || id2 === 'javascriptreact')
    ) {
      return true;
    }
    if (
      (id1 === 'typescript' || id1 === 'typescriptreact') &&
      (id2 === 'typescript' || id2 === 'typescriptreact')
    ) {
      return true;
    }
    return false;
  }

  // jaccard相似度
  public jaccardSimilarity(codeToken1: Set<string>, codeToken2: Set<string>) {
    const intersectionSize = new Set([...codeToken1].filter((x) => codeToken2.has(x))).size;
    const unionSize = new Set([...codeToken1, ...codeToken2]).size;

    return intersectionSize / unionSize;
  }

  // 合并处理片段
  public announcedSnippet(snippets: { path: string; score: number; content: string }[]) {
    let snippetsStr = '';
    snippets.forEach((snippet) => {
      snippetsStr += `Compare this snippet from ${snippet.path}:\n${snippet.content}\n`;
    });

    return snippetsStr.trim();
  }

  public fixedWindowSizeJaccardMatcher({
    textBeforeCursor,
    document,
  }: {
    textBeforeCursor: string;
    document: TextDocument;
  }) {
    const windowSize = 60;
    const referenceLanguageId = document.languageId;
    const referenceFilePath = workspace.asRelativePath(document.uri);
    const promptTokens = tokenizer.getSplitTokens(textBeforeCursor);

    const cache = new Map<string, any[]>();
    let similarSnippets: { path: string; score: number; content: string }[] = [];
    workspace.textDocuments.forEach((doc) => {
      const neiborFilePath = workspace.asRelativePath(doc.uri);

      if (
        !doc.uri.path.endsWith('.git') &&
        neiborFilePath !== referenceFilePath &&
        this.isLanguageMatched(doc.languageId, referenceLanguageId)
      ) {
        const lineCount = doc.lineCount;
        let scoreFlag = 0;
        let targetSnippet;

        const source = doc.getText();
        const sourceArr = source.split('\n');
        const key = neiborFilePath + ':' + source;

        const tokens: Set<string>[] = cache.get(key) ?? [];
        const noCache = tokens.length === 0;

        if (noCache) {
          sourceArr.forEach((line, index) => {
            tokens.push(tokenizer.getSplitTokens(line));
          });
          cache.set(key, tokens);
        }

        for (let i = 0; i < lineCount; i++) {
          const endPos = Math.min(i + windowSize, lineCount);
          const start = new Position(i, 0);
          const end = new Position(endPos, 0);
          const range = new Range(start, end);
          const content = doc.getText(range);

          // const snippetTokens = tokenizer.getSplitTokens(content);
          const snippetTokens = tokens
            .splice(i, endPos)
            .reduce((acc, set) => new Set([...acc, ...set]), new Set());

          const score = this.jaccardSimilarity(promptTokens, snippetTokens);
          if (score > scoreFlag) {
            scoreFlag = score;
            targetSnippet = { path: neiborFilePath, score, content };
          }

          // 文件行数不足时跳出循环
          if (i + windowSize >= lineCount) {
            break;
          }
        }

        if (targetSnippet?.score) {
          similarSnippets.push(targetSnippet);
        }
      }
    });

    const topScoreSnippets = similarSnippets.sort((a, b) => b.score - a.score).slice(0, 4);
    const snippets = this.announcedSnippet(topScoreSnippets);

    // console.log(_prompt);
    // console.log(tokenizer.getTokeSize(_prompt));

    return snippets;
  }
}
