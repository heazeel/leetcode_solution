import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ALIBABA_API_KEY } from '../constants';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';

class FollowUpQuestion {
  public static instance: FollowUpQuestion;
  public model: ChatAlibabaTongyi;
  public parser;
  public initPrompt: ChatPromptTemplate;

  constructor() {
    // 初始化qwen
    this.model = new ChatAlibabaTongyi({
      alibabaApiKey: ALIBABA_API_KEY,
      temperature: 1,
      modelName: 'qwen-plus',
    });

    this.parser = StructuredOutputParser.fromZodSchema(
      z.object({
        questions: z.array(z.string()).length(3),
      }),
    );

    this.initPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        你是一位出色的人工智能copilot提问专家，擅长站在人类的角度向人工智能 copilot 提出问题
        职能&任务：你的任务是根据下面给到的几个方向，推荐3个有深度的问题（注意你发问的对象是人工智能 copilot，没有情感和个人经历），确保这些帮助用户更好的使用copilot，同时避免问题无实际意义、错误、过于简单或重复，确保人类在使用了你提供的问题之后，能够更好的使用人工智能 copilot，可以进行提问的方向参考如下：
          1. 提醒用户可以使用实时搜索能力，如果需要使用这条规则，你提出的问题中必须包含前缀为"@RealTimeSearch: " ，不能用于询问spm、埋点、鸿雁、模块创建、Arms告警、黄金令箭、ald等相关问题
          2. 提醒用户可以使用开发助手能力，用于解答\`spm（页面业务埋点：可以进行页面上访问、点击等数据的收集；不能收集性能、体验、稳定性等数据）\`或者\`埋点（包含业务数据埋点spm、Arms稳定性埋点）\`或者\`鸿雁（前端页面搭建系统，只负责搭建页面，没有别的能力）\`或者\`模块创建（前端模块创建）\`或者\`Arms告警（前端监控告警平台）\`或者\`黄金令箭（前端自定义业务数据埋点，不能收集性能、体验、稳定性等数据）\`或者\`ald（阿拉丁投放平台）\`等相关问题，如果需要使用这条规则，不要问和服务端相关的问题，你提出的问题中必须包含前缀为"@DeveloperAssistant: "，贴合每个关键字的主题
          3. 提醒用户可以提出任何关于前端开发、前端架构、前端工程、前端开发工具等相关的问题
          4. 注意你提出的问题中不能包含 “Copilot” 等关键字，如果需要使用，可以使用 “你” 来代替

          尽你最大的努力，来回答用户的问题.. \n
          {format_instructions} 
      `),
      HumanMessagePromptTemplate.fromTemplate('用户当前提问：{question}'),
    ]);
  }

  getFinalPrompt(isInit?: boolean): ChatPromptTemplate {
    if (isInit) {
      return this.initPrompt;
    }

    const followUpPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
      角色：你是一位出色的人工智能 copilot提问专家，擅长站在人类的角度向人工智能 copilot 提出问题，
      职能&任务：你的任务是根据给定的聊天记录以及人类用户目前提出的问题({question})，精心制定3个更有深度的追问（注意你发问的对象是人工智能，没有情感和个人经历），确保这些追问能够紧密联系用户的原始问题，可以适当进行一些发散，确保人类在使用了你提供的追问之后，能够更好的使用人工智能 copilot进一步得到答案，你生成的追问必须满足以下的判断规则：
      判断规则：
        1. 当{question}中明确包含\`spm（页面业务埋点）\`或者\`埋点（业务数据埋点）\`或者\`鸿雁（页面搭建系统）\`或者\`模块创建（前端模块创建）\`或者\`Arms告警（前端监控告警平台）\`或者\`黄金令箭（前端自定义业务数据埋点）\`或者\`ald（阿拉丁投放平台）\`关键字时，你提出的问题必须包含至少一条前缀是"@DeveloperAssistant: " 的追问，否则不可以使用该规则
        2. 当{question}中的前缀是"@RealTimeSearch: " 时，你提出的问题必须都是前缀为"@RealTimeSearch: " 的追问，追问的内容不能包括spm、埋点、鸿雁、模块创建、Arms告警、黄金令箭、ald等相关问题
        3. 当{question}中的前缀是"@DeveloperAssistant: " 时，你提出的问题必须都是前缀为"@DeveloperAssistant: " 的追问， 且主题必须和\`spm（页面业务埋点）\`或者\`埋点（业务数据埋点）\`或者\`鸿雁（页面搭建系统）\`或者\`模块创建（前端模块创建）\`或者\`Arms告警（前端监控告警平台）\`或者\`黄金令箭（前端自定义业务数据埋点）\`或者\`ald（阿拉丁投放平台）\`等相关
        4. 当{question}中明确包含 javascript、typescript、css等具体的代码片段让你进行解释时，你提出的问题中需要包含至少一条前缀必须是"/explain: " 或者前缀必须是"/fix: " 的追问，注意，必须包含代码片段，提问中如果没有代码片段，不可以使用该规则。
        5. 当上述规则都不满足，且你判断回答用户的问题或者你回答的追问问题明确需要进行互联网查询时，你提出的问题中必须包含前缀为"@RealTimeSearch: " ，追问的内容不能包括spm、埋点、鸿雁、模块创建、Arms告警、黄金令箭、ald等相关问题

      注意！追问问题的视角是以人类的角度向copilot发出提问，注意主语和第一人称的使用！！！，请用中文提出这些问题, 追问问题前一定要先进行上面规则的判断，请注意遵循以下标准：
        1. 相关性:每个问题都必须直接与用户的原问题有关，以确保对话的连贯性和针对性。
        2. 避免无效提问：确保每个问题都具有深度，避免提出无意义、错误、过于简单或重复的问题。
        3. 中文描述：问题描述需使用准确清晰的中文。 
        5. 确保给出的追问问题能够让人类更好的找到原始问题的答案
        6. 必须满足追问问题的视角是以人类的角度向copilot发出提问！
        7. 必须使用上述提供给你的工具并在返回结果中体现出来

      尽你最大的努力，来回答用户的问题.
      {format_instructions}
      下面是之前的历史问答记录：
      {historyList}
      `),
      HumanMessagePromptTemplate.fromTemplate('{question}'),
    ]);

    return followUpPrompt;
  }

  async get(lastQuestion: string, history?: { type: string; content: string }[], isInit?: boolean) {
    const chain = RunnableSequence.from([this.getFinalPrompt(isInit), this.model, this.parser]);
    try {
      const historyList =
        history?.map((item) => {
          return item.type === 'ask' ? `ask: ${item.content}` : `answer: ${item.content}`;
        }) || [];
      const res = await chain.invoke({
        question: lastQuestion,
        format_instructions: this.parser.getFormatInstructions(),
        historyList: !isInit ? historyList.join('\n') : '',
      });

      return res;
    } catch (error: any) {
      console.log(error.message);
    }
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new FollowUpQuestion();
    }
    return this.instance;
  }
}

const followUpQuestion = FollowUpQuestion.getInstance();
export default followUpQuestion;
