# 插件

乌鸦 VSCode 插件是一款 AI 代码助手，可以通过自然语言来生成代码或者答疑。

## 本地调试 WebUI

```bash
# 1. 启动 Web 服务
npm run start:webview
# 2. 开启调试模式：cmd + shift + b or F5
# 3. 激活插件：点击左侧图标 or cmd + shift + i
# 4. 打开页面 http://localhost:5173/
```

## 目录介绍

- prompts 提示词工程相关代码，标准化使用提示词
- src 插件代码
- webview-ui 自定义 Webview 的 Chat 前端代码
- res 插件素材资源目录

## Utilities 介绍

- chat：自由聊天 or Text2Code 相关接口的封装
- common：通用的工具方法
- editor：编辑区域功能封装，如获取选中文本，插入或者替换文本等操作
- file：文件操作，如读写文件，创建临时文件等
- logger：日志记录
- message：消息通信
- request：基础的请求库
- state：全局状态管理，例如 userToken
- update：私有化插件自动升级
- workspace：工作区相关操作。

## 源设置

```bash

```
