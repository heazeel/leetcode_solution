import {
  CancellationToken,
  InlineCompletionContext,
  InlineCompletionItem,
  InlineCompletionItemProvider,
  Position,
  TextDocument,
  Range,
  ExtensionContext,
  commands,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from 'vscode';
import CompletionRequestClient, { getCursorText, getFilePath } from './request';
import { Logger } from '../../utilities/logger';
// import { InlineCompletionEnhancer } from '../../codex';
import CacheHandler from './cache';
import CodeMatcher from '../../utilities/codeMatcher';
import tokenizer from '../../utilities/tokenizer';

const PromptElementKeyMap: { [key in keyof PromptElementType]: string } = {
  textBeforeCursor: 'textBeforeCursor',
  importedFile: 'importedFile',
  similarSnippet: 'similarSnippet',
  languageMarker: 'languageMarker',
  pathMarker: 'pathMarker',
};

interface PromptElementType {
  textBeforeCursor: string;
  importedFile: string;
  similarSnippet: string;
  languageMarker: string;
  pathMarker: string;
}

/**
 * 参考文章 https://ata.atatech.org/articles/11020091609
 * 1. Node 多线程能力
 * 2. 过滤无效请求
 *  - 不改变语义的输入
 *  - 文件内容过大
 *  - 文件内容过小
 *  - 用户操作中断
 * 3. 请求节流处理
 */
const isDocumentTooLarge = (document: TextDocument) => {
  try {
    document.getText();
  } catch (e) {
    if (e instanceof RangeError) {
      return true;
    }
  }
  return false;
};

const MIN_PROMPT_CHARS = 10;
const isDocumentTooShort = (document: TextDocument) => document.getText().length < MIN_PROMPT_CHARS;

export default class CrowInlineCompletionItemProvider implements InlineCompletionItemProvider {
  private debounceTimeout: NodeJS.Timeout | null = null;
  private codeMatcher = new CodeMatcher();
  private cacheHandler = new CacheHandler();

  client: CompletionRequestClient;
  loadingStatusBarItem: StatusBarItem;
  needCompletion: boolean = false;
  // inlineCompletionEnhancer?: InlineCompletionEnhancer;

  constructor(readonly context: ExtensionContext) {
    // 构建一个补全增强器
    const workspacePath = workspace.workspaceFolders?.[0].uri.path;
    if (workspacePath) {
      // this.inlineCompletionEnhancer = new InlineCompletionEnhancer(workspacePath);
      // this.inlineCompletionEnhancer.setup();
    }

    this.client = new CompletionRequestClient(context);
    // 状态栏选项
    this.loadingStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    this.loadingStatusBarItem.text = '$(crow-icon)';
    this.loadingStatusBarItem.tooltip = 'Crow 帮您补全代码 ✨';
    this.loadingStatusBarItem.show();
    context.subscriptions.push(this.loadingStatusBarItem);

    // 监听字符输入
    workspace.onDidChangeTextDocument((event) => {
      const activeEditor = window.activeTextEditor;
      // 确保变更是由用户输入引起的
      if (
        activeEditor &&
        event.document === activeEditor.document &&
        event.contentChanges.length > 0
      ) {
        // 获取光标所在的位置
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        const cursorPosition = new Position(selection.active.line, selection.active.character + 1);
        // 光标前后的文本
        // const textBeforeCursor = document
        //   .getText(new Range(new Position(cursorPosition.line, 0), cursorPosition))
        //   .trim();

        const textAfterCursor = document.getText(
          new Range(cursorPosition, new Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)),
        );

        // const contentChange = event.contentChanges[0];
        // 获取用户最新输入的文本（可能不只是一个字符）
        // const newText = contentChange.text;

        // 0. 删除内容时不补全代码
        // 1. 换行时，光标前不是左括号时不补全代码
        // 2. 光标前文本为空时不补全代码
        // 3. 连续空格输入时不补全代码
        // 4. 后文紧跟英文字符时不补全代码

        // if (newText.length === 0) {
        //   return (this.needCompletion = false);
        // } else if (
        //   newText.includes('\n') &&
        //   !['(', '{', '[', '`'].includes(textBeforeCursor.slce(-1))
        // ) {
        //   return (this.needCompletion = false);
        // } else if (textBeforeCursor.length === 0) {
        //   return (this.needCompletion = false);
        // } else if (textBeforeCursor.slice(-2) === '  ') {
        //   return (this.needCompletion = false);
        // } else if (textAfterCursor[0] && textAfterCursor[0].match(/[a-zA-Z]/)) {
        //   return (this.needCompletion = false);
        // }

        // 与github逻辑一致，后文紧跟英文和数字字符时不补全代码
        if (textAfterCursor[0] && textAfterCursor[0].match(/[a-zA-Z0-9]/)) {
          return (this.needCompletion = false);
        }
      }
      return (this.needCompletion = true);
    });
  }

  // 代码块注释
  private commentBlockAsSingles(text: string, languageId: string): string {
    const lines = text.split('\n');
    let commentLines: string[] = [];

    switch (languageId) {
      case 'javascript':
      case 'typescript':
      case 'javascriptreact':
      case 'typescriptreact':
      case 'java':
      case 'go':
      case 'rust':
        commentLines = lines.map((line) => `// ${line}`);
        break;
      case 'python':
      case 'ruby':
        commentLines = lines.map((line) => `# ${line}`);
        break;
      case 'cpp':
      case 'css':
      case 'less':
      case 'sass':
        commentLines = lines.map((line) => `/* ${line} */`);
        break;
      case 'html':
        commentLines = lines.map((line) => `<!-- ${line} -->`);
        break;
      default:
        commentLines = lines.map((line) => `// ${line}`);
        break;
    }

    return commentLines.join('\n');
  }

  private getTextBeforeCursor(document: TextDocument, position: Position) {
    const text = document.getText(new Range(new Position(0, 0), position));
    return text;
  }

  private getTextAfterCurson(document: TextDocument, position: Position) {
    const endLine = document.lineCount - 1;
    const endCharacter = document.lineAt(endLine).text.length;
    const text = document.getText(new Range(position, new Position(endLine, endCharacter)));
    return text;
  }

  private getPrompt(document: TextDocument, position: Position) {
    const textBeforeCursor = this.getTextBeforeCursor(document, position);
    const textAfterCursor = this.getTextAfterCurson(document, position);
    const similarSnippet = this.getSimilarFile(document, textBeforeCursor);
    const languageMarker = this.getLanguageMarker(document);
    const pathMarker = this.getPathMarker(document);

    return this.promptFullfill({
      textBeforeCursor,
      importedFile: '',
      similarSnippet,
      languageMarker,
      pathMarker,
    });
  }

  // 文件开头的标记语法
  private getLanguageMarker(document: TextDocument) {
    const languageMap: { [key: string]: string } = {
      html: '<!DOCTYPE html>',
      python: '#!/usr/bin/env python3',
      ruby: '#!/usr/bin/env ruby',
      shellscript: '#!/bin/sh',
      yaml: '# YAML data',
    };

    if (languageMap[document.languageId]) {
      return languageMap[document.languageId];
    }

    return `// ${document.languageId}`;
  }

  // 文件的路径信息
  private getPathMarker(document: TextDocument) {
    const path = workspace.asRelativePath(document.uri);
    return path ? this.commentBlockAsSingles(`Path: ${path}`, document.languageId) : '';
  }

  // 与当前文件相似度较高的内容
  private getSimilarFile(document: TextDocument, textBeforeCursor: string) {
    const snippet = this.codeMatcher.fixedWindowSizeJaccardMatcher({
      document,
      textBeforeCursor,
    });

    return this.commentBlockAsSingles(snippet, document.languageId);
  }

  // 优先级处理后的prompt
  private promptFullfill(props: PromptElementType) {
    const maxToken = 20000;
    // 处理优先级
    const dealPriority = {
      [PromptElementKeyMap.textBeforeCursor]: 5,
      [PromptElementKeyMap.importedFile]: 4,
      [PromptElementKeyMap.similarSnippet]: 3,
      [PromptElementKeyMap.pathMarker]: 2,
      // [PromptElementKeyMap.languageMarker]: 1,
    };

    // 文本组合优先级
    const combinePriority = {
      // [PromptElementKeyMap.languageMarker]: 5,
      [PromptElementKeyMap.pathMarker]: 4,
      [PromptElementKeyMap.importedFile]: 3,
      [PromptElementKeyMap.similarSnippet]: 2,
      [PromptElementKeyMap.textBeforeCursor]: 1,
    };

    const tokens = {
      [PromptElementKeyMap.textBeforeCursor]: tokenizer.getTokeSize(props.textBeforeCursor),
      [PromptElementKeyMap.importedFile]: tokenizer.getTokeSize(props.importedFile),
      [PromptElementKeyMap.similarSnippet]: tokenizer.getTokeSize(props.similarSnippet),
      [PromptElementKeyMap.pathMarker]: tokenizer.getTokeSize(props.pathMarker),
      // [PromptElementKeyMap.languageMarker]: tokenizer.getTokeSize(props.languageMarker),
    };

    let promptArr = [];
    let totalTokenSize = 0;

    const items = Object.keys(dealPriority).map((key: string) => ({
      key,
      priority: dealPriority[key],
      text: (props as any)[key],
      tokenSize: tokens[key],
    }));

    items.sort((a, b) => b.priority - a.priority);

    for (const item of items) {
      if (totalTokenSize + item.tokenSize <= maxToken) {
        promptArr.push({ key: item.key, text: item.text });
        totalTokenSize += item.tokenSize;
      } else {
        break;
      }
    }

    promptArr.sort((a, b) => combinePriority[b.key] - combinePriority[a.key]);
    const prompt = promptArr.map((item) => item.text).join('\n');

    return prompt;
  }

  generateInlineCompletionItem(promptArr: string[], position: Position) {
    const completionItems: InlineCompletionItem[] = [];
    promptArr.forEach((prompt) => {
      const range = new Range(position, position);
      const item = new InlineCompletionItem(prompt, range);
      item.command = {
        title: '采用补全代码',
        command: 'crowCopilot.useInlineCompletion',
      };
      completionItems.push(item);
    });

    return completionItems;
  }

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    _: InlineCompletionContext,
    token: CancellationToken,
  ): Promise<InlineCompletionItem[] | undefined> {
    // 用户操作中断不处理
    if (token.isCancellationRequested) {
      return undefined;
    }
    // 文件内容过大或者过小不处理
    if (isDocumentTooLarge(document) || isDocumentTooShort(document)) {
      return undefined;
    }
    if (!this.needCompletion) {
      return undefined;
    }

    const prefix = this.getPrompt(document, position);
    const suffix = this.getTextAfterCurson(document, position);

    // 一级缓存
    if (!this.cacheHandler.isGlobalCacheEmpty()) {
      const cachedPrompts = this.cacheHandler.getCachedChoices(prefix, suffix);
      if (cachedPrompts?.length) {
        return this.generateInlineCompletionItem(cachedPrompts, position);
      }
    }

    // 二级缓存
    const promptKey = this.cacheHandler.keyForPrompt(prefix);
    const cachedChoices = this.cacheHandler.completionCache.get(promptKey);
    const choices = cachedChoices?.filter((text) => text) || [];
    if (choices.length > 0) {
      this.cacheHandler.updateGlobalCache(prefix, suffix, promptKey);
      return this.generateInlineCompletionItem(choices, position);
    }

    return new Promise((resolve) => {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      this.debounceTimeout = setTimeout(async () => {
        try {
          const filePath = getFilePath(document);
          // const prefix = this.getPrompt(document, position);
          // const suffix = this.getTextAfterCurson(document, position);

          // 补全增强器
          // const isReady = this.inlineCompletionEnhancer?.ready;
          // let enhancedPrompt = prefix;
          // if (isReady) {
          //   enhancedPrompt =
          //     (await this.inlineCompletionEnhancer?.enhance(prompt, suffix)) || prompt;
          // }

          if (filePath && prefix) {
            // 请求代码时展示加载状态
            this.loadingStatusBarItem.text = '$(loading~spin)';
            const response = await this.client.request({
              filePath,
              prompt: prefix,
              suffix,
            });

            // 展示代码后隐藏加载状态
            this.loadingStatusBarItem.text = '$(crow-icon)';
            const { choices } = response.data || {};
            const completionTextArr = choices.map((choice: { text: string }) => choice.text);

            // 更新一级缓存
            this.cacheHandler.updateGlobalCache(prefix, suffix, promptKey);
            // 更新二级缓存
            this.cacheHandler.completionCache.put(promptKey, completionTextArr);

            const completionItems = this.generateInlineCompletionItem(completionTextArr, position);
            resolve(completionItems);
          }
        } catch {}
      }, 100);
    });
  }
}
