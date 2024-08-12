# 提示词工程

参考 LangChain 的 [Model I/O](https://js.langchain.com/docs/modules/model_io/) 部分的设计，主要功能有模板化、动态选择以及控制模型输入。

我们可以通过提供一个模板、一些例子和用户输入来生成提示词。

## Manifest

- name 在对话框内展示的名称
- description 描述该提示词具体作用
- key 获取提示词模板的唯一 id
- template 提示词模板地址
- inputVariables 需要替换的模板参数名称列表
- defaultValues 可以通过插件内置功能获取模板参数值，例如 `TextEditor.getSelectedText` 获取当前选中的内容。

构建后会针对插件和WebviewUI生成不同的配置文件
