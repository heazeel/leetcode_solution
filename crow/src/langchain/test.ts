import { workspace, window } from 'vscode';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import CrowFactory from './CrowFactory';
import CrowRetrieverDelegate from './CrowRetrieverDelegate';

(async function () {
  const outputChannel = window.createOutputChannel('AI Output');
  outputChannel.show();

  const root = workspace.workspaceFolders![0].uri.fsPath;
  // 创建代码检索器
  const crowRetrieverDelegate = new CrowRetrieverDelegate(`${root}/src/`)
  await crowRetrieverDelegate.setup();
  const retriever = crowRetrieverDelegate.retriever!;
  outputChannel.appendLine('本地仓库代码向量化处理完成');

  // 创建模型
  const model = CrowFactory.createModel().pipe(new StringOutputParser());

  // 创建记忆
  const memoryKey = 'chat_history';
  const memory = CrowFactory.createMemory(memoryKey);

  // 改叙下用户的问题
  const questionGeneratorTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate('Given the following conversation about a codebase and a follow up question, rephrase the follow up question to be a standalone question.'),
    new MessagesPlaceholder(memoryKey),
    HumanMessagePromptTemplate.fromTemplate('Follow Up Input: {question}\nStandalone question:'),
  ]);

  // 拼接代码和概述后的问题
  const combineDocumentsPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\n"
    ),
    new MessagesPlaceholder(memoryKey),
    HumanMessagePromptTemplate.fromTemplate(
      'Question: {question}',
    ),
  ]);

  // 获取问题相关的代码片段和历史内容
  const combineDocumentsChain = RunnableSequence.from([
    {
      question: (output: string) => output,
      chat_history: async () => {
        const { chat_history } = await memory.loadMemoryVariables({});
        outputChannel.appendLine(`记忆内容：${JSON.stringify(chat_history)}\n`);
        return chat_history;
      },
      context: async (output: string) => {
        outputChannel.appendLine('===========================');
        outputChannel.appendLine(`概述后的问题：${output}\n`);
        const relevantDocs = await retriever.getRelevantDocuments(output);
        outputChannel.appendLine(`检索到的代码片段数量：${relevantDocs.length}\n等待模型处理...\n`);
        const content = formatDocumentsAsString(relevantDocs);
        return content;
      },
    },
    combineDocumentsPrompt,
    model,
    new StringOutputParser(),
  ]);

  const conversationalQaChain = RunnableSequence.from([
    {
      question: (i: { question: string }) => i.question,
      chat_history: async () => {
        const { chat_history } = await memory.loadMemoryVariables({});
        return chat_history;
      },
    },
    questionGeneratorTemplate,
    model,
    new StringOutputParser(),
    combineDocumentsChain,
  ]);

  while (true) {
    // const question = '如何获取兜底数据';
    const question = await window.showInputBox({
      placeHolder: '输入问题',
      prompt: '输入和该项目代码相关的问题',
      ignoreFocusOut: true,
    });

    if (!question) {
      outputChannel.appendLine('代码仓库答疑程序退出');
      return;
    }

    const result = await conversationalQaChain.invoke({
      question,
    });

    outputChannel.appendLine(`${result}\n`);

    await memory.saveContext(
      {
        input: question,
      },
      {
        output: result,
      }
    );
  }
})();
