import { AgentExecutor,  createStructuredChatAgent} from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import CrowModel from './CrowModel';
import { ALIBABA_API_KEY } from '../constants';
import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools';
import { getCategory } from "./tools/categroy";
import { pull } from "langchain/hub";
import z from 'zod';
const testTools = async () => {
  const prompt = await pull<ChatPromptTemplate>(
    "hwchase17/structured-chat-agent"
  );

  const llm = new CrowModel({
    alibabaApiKey: ALIBABA_API_KEY,
    modelName: 'qwen-max',
    temperature: 0.6,
  });


  const tools = [
    new DynamicTool({
      name: 'CategoryTool',
      description: '使用这个工具可以获得当前项目的所有文件列表，需要项目文件列表时，请务必使用该方法！方法将会用JSON数据的格式返回文件列表',
      func: async () => {
        const category = await getCategory();
        console.log(category);
        return JSON.stringify(category);
      },
    }),
    new DynamicStructuredTool({
      name: 'FilterFileWithType',
      description: `使用这个工具可以对提供的文件列表中按照指定的文件类型进行过滤特别注意！该函数的输入参数应该是一个JSON对象，包含 ['files'] 和 ['type']两个属性，['files']表示要过滤的文件列表，['type']表示要过滤的文件类型，注意如果要过滤多个文件类型，请用['|']分割, 如'.js|.jsx', 该函数将会返回一个过滤后的JSON数组`,
      schema: z.object({
        files: z.array(z.object({
          name: z.string(),
          path: z.string()
        })),
        type: z.string(),
      }),
      func: async ({files, type}) => {
        const types = type.split('|');
        const result:any[] = [];

        files.forEach(file => {
          types.forEach(type => {
            if (file.name.endsWith(type)) {
              result.push(file);
            }
          });
        });
        return JSON.stringify(result);
      }
    })
  ];

  

  const agent = await createStructuredChatAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const result = await agentExecutor.invoke({
    input: "列出当前项目中所有和js相关的文件，注意，文件列表必须是当前项目真实的文件列表，ts、tsx文件也可以算成js文件"
  });

  console.log('reactAgent', result);
};




export default testTools;