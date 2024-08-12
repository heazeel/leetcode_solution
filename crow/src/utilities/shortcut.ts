import { window, TextEditor } from 'vscode';
import promptConfigs from '../prompts/promptConfigs.json';
import { TextEditorDelegate } from './editor';

/**
 * 提供了一个用于根据模板和参数动态生成提示信息的类。
 */
class PromptTemplate {
  /**
   * 模板字符串，其中包含一个或多个用于替换的变量占位符。
   */
  private template: string;

  /**
   * 输入变量列表，表示模板字符串中可被替换的变量名称。
   */
  private inputVariables: string[];

  /**
   * 构造函数，用于初始化PromptTemplate实例。
   *
   * @param options - 初始化配置对象，包括模板字符串和输入变量列表。
   * @param options.template - 模板字符串，其中包含一个或多个用于替换的变量占位符。
   * @param options.inputVariables - 输入变量列表，表示模板字符串中可被替换的变量名称。
   */
  constructor({ template, inputVariables }: { template: string; inputVariables: string[] }) {
    this.template = template;
    this.inputVariables = inputVariables;
  }

  /**
   * 根据给定的参数对象，将模板字符串中的变量占位符替换为实际值，生成最终的提示信息。
   *
   * @param params - 参数对象，键值对形式，键对应于输入变量列表中的变量名称，值为对应的替换值。
   * @returns 处理后的模板字符串，即最终的提示信息。
   */
  format(params: { [key: string]: any }) {
    let template = this.template;
    const keys = Object.keys(params).filter((key) => this.inputVariables.indexOf(key) >= 0);
    keys.forEach((key) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), params[key]);
    });

    if (params.__inputValue) {
      template += `\n ${params.__inputValue}`;
    }
    
    return template;
  }
}

/**
 * 定义PromptConfig类型，表示promptConfigs数组中的一种配置项。
 */
export type PromptConfig = (typeof promptConfigs)[number];

/**
 * 定义PromptParams类型，表示一个键值对对象，用于存储提示所需的参数。
 */
export type PromptParams = { [key: string]: any };


/**
 * 快捷指令，可迅速生成提示词
 */
export class Shortcut {
  /**
   * 根据给定的 key 值，在 promptConfigs 数组中查找与之匹配的 PromptConfig 对象。
   * @param key 要查找的 key 值
   * @returns 如果找到匹配的 PromptConfig 对象，则返回该对象；否则返回 undefined
   */
  static getPromptConfigByKey(key: string): PromptConfig | undefined {
    return promptConfigs.find((config) => config.key === key);
  }

  /**
   * 获取基础的 PromptConifg 信息，屏蔽 template 等长度过长且调用方不消费的值
   * @returns 精简后的 PromptConfig 列表
   */
  static getPromptConfigs(): PromptConfig[] {
    return promptConfigs.map((config) => ({ ...config, template: '' }));
  }

  static getSelectedTextWithLanguage(inputValue?:string) {
    const editor = window.activeTextEditor;
    if (editor) {
      const language = editor.document.languageId;
      const selectedText = TextEditorDelegate.getSelectedText(editor);
      if (!selectedText && !inputValue) {
        window.showErrorMessage('未在右侧编辑区选择内容');
        return '';
      }
      return `\`\`\`${language}\n${selectedText}\n\`\`\``;
    } else {
      if (!inputValue) {
        window.showErrorMessage('未打开可用文本编辑器');
      }
      return '';
    }
  }

  static formatPrompt(key: string, params?: PromptParams) {
    const promptConfig = this.getPromptConfigByKey(key);
    if (!promptConfig) {
      return;
    }
    const { template, inputVariables = [], defaultValues = [] } = promptConfig;
    const promptTemplate = new PromptTemplate({
      template,
      inputVariables,
    });

    let isError = false;

    const inputValue = params?.__inputValue;

    const defaultParams: PromptParams = {};
    if (defaultValues.length) {
      defaultValues.forEach(({ key, value }) => {
        if (value === 'TextEditor.getSelectedText') {
          const selectedTextWithLanguage = this.getSelectedTextWithLanguage(inputValue);
          if (!selectedTextWithLanguage && !inputValue) {
            isError = true;
          }
          defaultParams[key] = selectedTextWithLanguage;
        } else {
          defaultParams[key] = value;
        }
      });
    }

    if (isError) {
      return '';
    }

    const prompt = promptTemplate.format({ ...defaultParams, ...params });
    return prompt;
  }
}
