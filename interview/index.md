### 自我介绍

- 我叫何志杰，之前是在猫超工作，主要负责两个方向：
  - 一是组内的 vscode 研发提效插件，模型侧使用了 Aone、通义千问，使用 LangChain 大模型应用框架来编排调用链路。
    - for 开发过程提效。
      - chat 功能。包括侧边栏的聊天框和编辑区内的聊天框
      - 快捷指令。通过编写一些特定的 prompt，结合 ast 静态代码解析，提供一键生成数据校验代码、进行代码保护、快速生成告警配置和埋点等功能
      - 个性化代码补全。
        - 工程上，会采集已开 tab 中的相似代码，然后通过一二级缓存来提高补全体验
        - 模型侧能力侧，我们整理了超市的基础组件库和常用的模块代码，在本地生成了一个向量数据库，可以从向量数据库中匹配相似代码
      - AI Commit。主要解决 commit 难写，与提交代码关联度不高等问题。
    - for 代码理解提效
      - 我们做了一个针对代码工作区的 RAG 答疑，对当前工作区代码进行适当的文本分割，再通过 embeding 将文本内容向量化存入本地的向量数据库中，就相当于为给大模型外挂了一个知识库，提问时会先从知识库里匹配关键信息，最终生成一个增强后的 prompt 给到大模型。
  - 二是 C 端业务需求与横向能力建设
    - 主要负责用增域拉新、品牌馆、半⽇达等 C 端业务，参与前期的 mrd、prd 评审，评估风险点、设计前端技术方案，保障需求上线。主要会做对应的模块开发，比如签到、任务面板、抽奖、红包领取等模块，然后负责页面搭建、配置页面插件，发布上线、监控全流程；
      - 参与业务调研，积极与业务沟通，发现业务痛点，主导设计了基于 Mars 动画引擎，可配置、可扩展、多形态的前端互动玩法组件，完成用增的一个底层抽奖⼯具的统⼀，降低业务的配置成本。
    - 横向方面的话，主要做稳定性相关的提效工具
      - 针对告警配置繁琐、历史告警订正困难等问题，调研 Arms 的开发能力，独立开发了一款稳定性插件，提供快速添加告警配置，也提供一键数据订正，历史遗留数据扫描等功能。会在 618、双 11 等大促前期，利用插件进行全站的告警配置扫描，确保告警都正常运行。

#### 对比其他人，自己的优势在哪

1. 技术敏感度比较高吧，平时也比较关心社区动态，一些自己没接触过的东西都会感兴趣的尝试一下
2. 工作主动性比较好，对于一个项目，会发表自己的观点，自发地推动自己完成任务和实现目标的能力
   主动学习：不断学习新技术和新知识，保持技术敏感度。
   目标导向：设定明确的目标，并为之努力。
   解决问题：遇到问题时，积极寻找解决方案，而不是等待他人提供帮助。
   持续改进：不断反思和改进自己的工作方法，提高效率和质量。

<!-- 抽象语法树（Abstract Syntax Tree，简称 AST）是一种用于表示源代码结构的树状数据结构。AST 是编译器和解释器在分析源代码时生成的中间表示形式，它将源代码的语法结构抽象成树形结构，其中每个节点代表源代码中的一种结构元素（如表达式、语句、函数等）。 -->

<!-- 大模型相关 ------------------------------------------------------- -->

### 什么是 LangChain

大模型应用框架，因为 LLM 的 API 只是提供了一个非常基础的调用方式，当我们要构建一个复杂的 Chat Bot 时，就需要考虑如何保存聊天的上下文、如何进行网络搜索、如何加载 pdf 等等工程问题，这些都是应用框架可以帮助我们解决的

一条 Chain 组成的每个模块都是继承自 Runnable 这个接口，而一条 Chain 也是继承自这个接口，所以一条 Chain 也可以很自然的成为另一个 Chain 的一个模块。并且所有 Runnable 都有相同的调用方式。 所以在我们写 Chain 的时候就可以自由组合多个 Runnable 的模块来形成复杂的 Chain

其最大的魅力就是进一步强化了模块化，可以方便的复用各种 chain 来组合成更复杂的 chain

对于任意 Runnable 对象，其都会有这几个常用的标准的调用接口：

- invoke 基础的调用，并传入参数
- batch 批量调用，输入一组参数
- stream 调用，并以 stream 流的方式返回数据
- streamLog 除了像 stream 流一样返回数据，并会返回中间的运行结果

### 大模型开发范式

#### RAG

检索能力增强，语义理解

- LLM 的局限性。
  - 首先，是幻觉问题，llm 本身是从大量数据中训练出来的一个概率模型，他并没有逻辑和实践经验
  - 第二个问题，对领域知识的欠缺。第一种是对知识的更新慢，例如你问他最新的新闻他肯定是不知道的，因为他的训练数据集不可能每天更新；第二种是特定领域的知识不了解，例如你要创建一个宠物医疗行业的聊天机器人，他本身训练数据集这方面的知识占比肯定是少的，就很容易出现幻想问题，然后瞎回答。更不要说公司内部的私有的知识库了
- RAG 的基本流程就是：
  - 用户输入提问
  - 检索：根据用户提问对 向量数据库 进行相似性检测，查找与回答用户问题最相关的内容
  - 增强：根据检索的结果，生成 prompt。 一般都会涉及 “仅依赖下述信息源来回答问题” 这种限制 llm 参考信息源的语句，来减少幻想，让回答更加聚焦
  - 生成：将增强后的 prompt 传递给 llm，返回数据给用户

#### Agents

充分利用 LLM 的推理决策能力，通过增加规划、记忆和工具调用的能力，构造一个能够独立思考、逐步完成给定目标的智能体

Function calling 本质上就是给 LLM 了解和调用外界函数的能力，LLM 会根据他的理解，在合适的时间返回对函数的调用和参数，然后根据函数调用的结果进行回答

就 Agents 执行中的过程中，一般是：

- 首先根据用户提供的问题进行思考，列出解决该问题需要执行的第一个任务 / 一系列任务
- 根据现有的工具集找到合适的工具，传递合适的参数，执行工具
- 观察工具输出的结果
- 根据工具输出的结果和现有环境信息，决策下一个任务的工具和参数
- 如果 llm 认为问题已经解决，输出答案

但就我个人看法，很多 agents 是非常偏前沿和探索，甚至是玩具的状态，目前有以下几个问题：

- 首先是安全问题。对于复杂的环境感知和任务，我们需要给 agents 构造有读写能力的 tool，例如数据库的写入 tool，而目前的 llm 的稳定性并不强，有概率构造出具有安全性隐患的操作
- 复杂任务处理的效果差。目前高质量的 agent 需要定义非常良好的 prompt 和抽象清晰的执行流程，这些都需要大量的调试时间，并且也很难覆盖所有场景。而且当遇到新的环境和新的任务时，也可能无法适应
- llm 不确定性，可能会在任务分配和执行的过程中，出现难以理解的 bug

**fine-turning：** Fine-tuning 技术可以用于优化预训练模型，以提高其在特定任务中的性能，例如问答、文本摘要、语言理解等
**Prompt 和 Embedding** 是 AIGC 模型的核心功能，语言处理应用。例如，它们可以用于聊天机器人、语言翻译、摘要生成、文本分类等

<!-- 工程相关 -------------------------------------------------------- -->

### 工程相关

#### 设计了配套的 cli 命令行工具，为什么

- 设计初期是为了能够直接使用命令来触发 AI commit，因为 vscode 对于终端的扩展能力非常有限，所以我选择了 cli 工具这种方式
- 第 2 点是能力解耦，随着功能增多，插件的代码其实越来越庞大了，将这部分能力抽离出来，可以方便维护和迭代，也方便在其他场景下进行扩展
- 第 3 点是适配上，组内并不是所有人都在使用 vscode 的，我们不会再去开发一款 intellj 插件，所以采用 cli 的方式，能很轻松的将一些功能带给所有用户使用，而不局限于编辑器

cli 架构参考了文件路由系统，会在入口处读取命令，注入环境变量，根据命令找到对应的目录中的 command 命令并执行
后续扩展命令只需要增加命令文件夹和 option 文件夹即可，不需要修改入口文件，不需要关注命令注册、错误处理等逻辑

#### 插件架构设计

插件架构主要分为两部分

- nodejs，在 vscode api 基础上，提供如文件读写、消息通信、编辑区处理等能力
- webview，UI 界面与用户交互

node 端我们细分了很多原子能力，比如
file：提供读写文件，创建临时文件等
editor：提供光标选区，编辑区文本插入&提取等
还有 git、终端操作、日志系统等等

除了原子能力外，还设计了一系列 Provider，比如行内指令、代码补全、只读文件系统等
provider 是 VS Code 插件开发中的一种设计模式，用于向编辑器提供特定类型的功能或服务，

原子能力是不能直接与 webview 关联的，所以在这之前我们设计了一层发布订阅模式的消息中心，可以通过消息中心组装调度原子能力

### 项目难点

- 编辑区行内对话框
  - 第一个是官方文档并没有给出一个合适的 api，可以让我们向编辑区插入一个定制的 webview 容器。但是 github copilot 却实现了，虽然知道他使用了很多不开放的能力，但还是带着好奇去看了下 vscode 的源码，结果发现早在 2021 年就已经有了个名为 createWebviewTextEditorinset 接口，它的作用就是能将自定义的 webview 插入到编辑区的指定位置。它还是个实验性的 api，官方的开发者也明确说明了往编辑区插入 webview 可能会加大编辑区的开销，所以他们后续也没有计划去开放它。而且这个 api 还比较特珠，即使在插件的配置文件中指定了允许使用实验性 api，插件启动时仍然会报错，后面查阅了大量资料发现，可以在使用 code 命令启动 vscode 时，在命令后面加上允许试用的参数就可以了，但是总不可能让每个人使用的时候都加上这个参数吧，了解到 vscode 其实有一个名为 argv.json 的配置文件，主要会保存一些 vscode 的全局变量，往这里直接插入配置，就可以让插件正常启动了。然后配合 cli 工具，在第一次插件启动的时候，通过子进层调用 cli 命令，进行配置文件的更改，然后提示重后 vscode 即可。
- 补全能力设计
  - 虽然 Aone 的补全按口已经能满足大部分场景的补全准确性了，但是我们在实现初期只是把单文件的上下文作为 prompt 传递了进去，缺失关联文件的信息，生成的补全代码有时候并不准确。
  - 所以需要实现一套能够提取相似代码的能力，这里使用了与 Github Copilot 相似的 Jaccard 算法，A 与 B 交集的大小与 A 与 B 并集的大小的比值。首先要对当前编辑区内容进行分词，分词的会排除一些关键字，为了避免超出 token 限制，引入了一个叫滑动窗口的概念，在当前已开 tab 的文件中，会从上到下，开一个默认 60 行的窗口，将窗口内代码分词后与前者计算出一个相似系数，然后窗口往下移动一行，以此类推。最后会生成一个根据相似系数排序的代码快照数组，选择排序最高的放进 prompt 中。除此以外还对补全性能进行了设计，引人名为一二级缓存的概念，一级缓存主要处理当前输入过程，用户的某个输入已经触发的补全，但由于用户输入太快，并没有接受这次补全，但是由于上下文变化不大，所以如果输入的内容与补全内容一致，可以将上次补全内容裁切后直接复用，比如输入了 const，补全返回了 a=1，当你后面继续输入 a 时，对之前返回的 a=1 进行裁场得到 =1，然后返回；二级缓存主要针对全局，每次补全都会返回一个内容，对应一份上下文，会把上下文和返回的内容缓存起来，如果后面碰到同样的上下文，可以直接返回结果，默认缓存 100 条，会用 LRUCache 进行缓存淘汰。

<!-- React 相关------------------------------------------------------------------->

### React 相关

#### React19 新特性

1. 新编译器，在使用新编译器以前，我们使用 useMemo、useCallback 和 memo 来手动缓存状态，新的 React 编译器会是一个开箱即用的特性。黄玄 React Forget，听说已经在 instagram 上试用了，但目前还没正式开源
2. useActionState，可以替代之前的 useFormState 和 useFormStatus。比如在提交表单时，传统实现方式的弊端：开发者需要手动处理挂起状态、错误状态等，使用 useActionState 可以减少代码量，比如错误信息，挂起状态都可以在一个 hook 里解决
3. useOptimistic，它允许你在进行异步操作时显示不同 state，比如点赞时可以直接将 UI 渲染状态变为点赞成功，同时进行点赞请求，请求结果返回后再次渲染最终结果。通常用于立即向用户呈现执行操作的结果，即使实际上操作需要一些时间来完成

#### 生命周期：

类组件偏向于面向对象的，函数组件偏向于函数式编程

React 的生命周期主要分为三个阶段：MOUNTING、RECEIVE_PROPS、UNMOUNTING

- 组件挂载时（组件状态的初始化，读取初始 state 和 props 以及两个生命周期方法，只会在初始化时运行一次）

  - componentWillMount 会在 render 之前调用（在此调用 setState，是不会触发 re-render 的，而是会进行 state 的合并。因此此时的 this.state 不是最新的，在 render 中才可以获取更新后的 this.state。）
  - componentDidMount 会在 render 之后调用

- 组件更新时（组件的更新过程是指父组件向下传递 props 或者组件自身执行 setState 方法时发生的一系列更新的动作）

  - 组件自身的 state 更新，依次执行

    - shouldComponentUpdate（会接收需要更新的 props 和 state，让开发者增加必要的判断条件，在其需要的时候更新，不需要的时候不更新。如果返回的是 false，那么组件就不再向下执行生命周期方法。）
    - componentWillUpdate
    - render 能获取到最新的 this.state
    - componentDidUpdate 能获取到最新的 this.state

  - 父组件更新 props 而更新
    - componentWillReceiveProps（在此调用 setState，是不会触发 re-render 的，而是会进行 state 的合并。因此此时的 this.state 不是最新的，在 render 中才可以获取更新后的 this.state。
    - shouldComponentUpdate
    - componentWillUpdate
    - render
    - componentDidUpdate

- 组件卸载时
  - componentWillMount（我们常常会在组件的卸载过程中执行一些清理方法，比如事件回收、清空定时器）

新版的生命周期函数增加了 getDerivedStateFromProps，这个生命周期其实就是将传入的 props 映射到 state 中。在 React 16.4 之后，这个函数每次会在 re-render 之前调用，
getDerivedStateFromProps 的作用是

无条件的根据 prop 来更新内部 state，也就是只要有传入 prop 值， 就更新 state
只有 prop 值和 state 值不同时才更新 state 值。

- 函数组件
  - useEffect
  - useLayoutEffect：在 DOM 更新之后，浏览器绘制之前，这样可以方便修改 DOM
  - useInsertionEffect：在 DOM 更新前，主要解决 css-in-js

#### ErrorBoundary

```js
import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 以触发下一次渲染时显示回退 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 你也可以将错误日志上报给服务器
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 你可以自定义回退 UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 事件合成：

React 的事件合成机制（是 React 为了提高跨浏览器兼容性和性能而设计的一种事件处理机制。它将浏览器的原生事件封装成一个合成事件对象，并在事件触发时统一处理。

1. 事件代理：
   React 并不直接将事件处理器绑定到每个 DOM 元素上，而是采用事件代理的方式，将所有事件处理器统一绑定到根节点（如 document 或 root 节点）上。
   当事件触发时，事件会冒泡到根节点，由根节点上的事件处理器统一处理。

2. 合成事件对象：
   React 创建了一个合成事件对象，它模仿了原生事件对象的接口，并且在所有浏览器中表现一致。
   合成事件对象包含了原生事件对象的大部分属性和方法，如 target、currentTarget、preventDefault()、stopPropagation() 等。

3. 事件池：
   为了提高性能，React 采用了事件池机制。每次事件触发时，React 会从事件池中复用合成事件对象，而不是每次都创建新的对象。
   事件处理完毕后，合成事件对象会被重置并返回事件池，以便下次复用。

#### fiber 架构

Fiber 是 React 的一个执行单元，React 将整个渲染任务拆分成了一个个的小任务进行处理，每一个小任务指的就是 Fiber 节点的构建。
拆分的小任务会在浏览器的空闲时间被执行，每个任务单元执行完成后，React 都会检查是否还有空余时间，如果有就交换主线程的控制权
Fiber 其实就是 JavaScript 对象，
在这个对象中有
child：子节点，
sibling：下一个兄弟节点，
return：节点的父级节点

### Fiber 更新机制

初始化

1. 创建 fiberRoot 和 rootFiber，第一次挂载的过程中，会将 fiberRoot 和 rootFiber 建立起关联
   - fiberRoot：首次构建应用， 创建一个 fiberRoot ，作为整个 React 应用的根基
   - rootFiber：一个 React 应用可以有多 ReactDOM.render 创建的 rootFiber ，但是只能有一个 fiberRoot（应用根节点）
2. workInProgress 和 current
   - workInProgress 是：正在内存中构建的 Fiber 树称为 workInProgress Fiber 树。在一次更新中，所有的更新都是发生在 workInProgress 树上。在一次更新之后，workInProgress 树上的状态是最新的状态，那么它将变成 current 树用于渲染视图。
   - current：正在视图层渲染的树叫做 current 树
     接下来会到 rootFiber 的渲染流程，首先会复用当前 current 树（ rootFiber ）的 alternate 作为 workInProgress ，如果没有 alternate，那么会创建一个 fiber 作为 workInProgress 。会用 alternate 将新创建的 workInProgress 与 current 树建立起关联。这个关联过程只有初始化第一次创建 alternate 时候进行
3. 深度调和子节点，渲染视图
   - 在新创建的 alternates 上，完成整个 fiber 树的遍历，包括 fiber 的创建
   - 最后会以 workInProgress 作为最新的渲染树，fiberRoot 的 current 指针指向 workInProgress 使其变为 current Fiber 树

更新
重新创建一颗 workInProgresss 树，复用当前 current 树上的 alternate ，作为新的 workInProgress ，由于初始化 rootfiber 有 alternate ，所以对于剩余的子节点，React 还需要创建一份，和 current 树上的 fiber 建立起 alternate 关联
渲染完毕后，workInProgresss 再次变成 current 树

fiber 调和阶段主要分为两部分

1. render 阶段。每一个 fiber 可以看作一个执行的单元，在调和过程中，每一个发生更新的 fiber 都会作为一次 workInProgress 。那么 workLoop 就是执行每一个单元的调度器，如果渲染没有被中断，那么 workLoop 会遍历一遍 fiber 树

   - beginWork：是向下调和的过程。就是由 fiberRoot 按照 child 指针逐层向下调和，期间会执行函数组件，实例类组件，diff 调和子节点，打不同 effectTag。

     - 对于组件，执行部分生命周期，执行 render ，得到最新的 children
     - 向下遍历调和 children ，使用 diff 算法复用 oldFiber
     - 打不同的副作用标签 effectTag ，比如类组件的生命周期，或者元素的增加，删除，更新

   - completeUnitOfWork：是向上归并的过程，如果有兄弟节点，会返回 sibling 兄弟，没有返回 return 父级，一直返回到 fiebrRoot ，期间可以形成 effectList，对于初始化流程会创建 DOM ，对于 DOM 元素进行事件收集，处理 style，className 等
     - 首先 completeUnitOfWork 会将 effectTag 的 Fiber 节点会被保存在一条被称为 effectList 的单向链表中。在 commit 阶段，将不再需要遍历每一个 fiber ，只需要执行更新 effectList 就可以了

2. commit 阶段
   _ 对一些生命周期和副作用钩子的处理，比如 componentDidMount ，函数组件的 useEffect ，useLayoutEffect ；
   _ 在一次更新中，添加节点，更新节点，删除节点，还有就是一些细节的处理，比如 ref 的处理
   commit 细分可以分为：
   _ Before mutation 阶段（执行 DOM 操作前）；
   _ 因为 Before mutation 还没修改真实的 DOM ，是获取 DOM 快照的最佳时期，如果是类组件有 getSnapshotBeforeUpdate ，那么会执行这个生命周期
   _ 会异步调用 useEffect
   _ mutation 阶段（执行 DOM 操作）；
   _ 置空 ref
   _ 对新增元素，更新元素，删除元素。进行真实的 DOM 操作
   _ layout 阶段（执行 DOM 操作后）
   _ 会执行 useLayoutEffect 钩子 \* 如果有 ref ，会重新赋值 ref

### 双缓冲树

React 用 workInProgress 树(内存中构建的树) 和 current (渲染树) 来实现更新逻辑。双缓存一个在内存中构建，一个渲染视图，两颗树用 alternate 指针相互指向，在下一次渲染的时候，直接复用缓存树做为下一次渲染树，上一次的渲染树又作为缓存树，这样可以防止只用一颗树更新状态的丢失的情况，又加快了 DOM 节点的替换与更新

### React Hooks

#### useState

useState 更新，底层会做这些事。

- 首先用户每一次调用 dispatchAction 都会先创建一个 update ，然后把它放入待更新 pending 队列中。
- 然后判断如果当前的 fiber 正在更新，那么也就不需要再更新了。
- 反之，说明当前 fiber 没有更新任务，那么会拿出上一次 state 和 这一次 state 进行对比，如果相同，那么直接退出更新。如果不相同，那么发起更新调度任务。这就解释了，为什么函数组件 useState 改变相同的值，组件不更新了

react18 之前
一般情况下 useState 都是异步更新的，会把多个 useState 的前后事务逻辑包在一起
当遇到 setTimeout/setInterval/Promise.then 等操作时是同步更新的
由于 react 的事件委托机制，调用 onClick 执行的事件，是处于 react 的控制范围的。
而 setTimeout 已经超出了 react 的控制范围，react 无法对 setTimeout 的代码前后加上事务逻辑

react18
所有更新都会进行批处理

#### Hooks 原理

在 fiber 调和过程中，遇到 FunctionComponent 类型的 fiber（函数组件），就会调用 renderWithHooks，并执行函数组件，执行里面 hooks

每个 fiber 都有一个 memoizedState 属性，用于保存 hooks 信息，是一个链表，通过 next 指针指向下一个
updateQueue 存放每个 useEffect/useLayoutEffect 产生的副作用组成的链表

更新 hooks 流程和双缓存的流程差不多，首先取出 workInProgres.alternate 里面对应的 hook ，然后根据之前的 hooks 复制一份，形成新的 hooks 链表关系。

#### Diff 算法的具体步骤

比较根节点：
如果根节点类型不同，直接替换整个节点。
如果根节点类型相同，比较属性并更新不同的属性。

比较子节点：
如果子节点是文本节点，直接更新文本内容。
如果子节点是元素节点，递归地进行比较。
如果子节点是列表节点，使用 key 属性进行比较

<!-- Redux 相关------------------------------------------------------------------------ -->

### Redux 原理

#### 发布订阅思想

redux 可以作为发布订阅模式的一个具体实现。redux 都会创建一个 store ，里面保存了状态信息，改变 store 的方法 dispatch ，以及订阅 store 变化的方法 subscribe 。

React-Redux 是沟通 React 和 Redux 的桥梁，它主要功能体现在如下两个方面：

1. 接受 Redux 的 Store，并把它合理分配到所需要的组件中。
2. 订阅 Store 中 state 的改变，促使消费对应的 state 的组件更新。

React-Redux 提供了一个高阶组件 connect，被 connect 包装后组件将获得如下功能：

1. 能够从 props 中获取改变 state 的方法 Store.dispatch 。
2. 将 redux state 中的数据，映射到当前组件的 props 中，子组件可以使用消费。
3. 当需要的 state ，有变化的时候，会通知当前组件更新，重新渲染视图。
   开发者可以利用 connect 提供的功能，做数据获取，数据通信，状态派发等操作

#### 整个订阅器的核心，层层订阅，上订下发

层层订阅：React-Redux 采用了层层订阅的思想，redux 提供了一个 Provider 组件，里面有一个 Subscription，每一个用 connect 包装的组件，内部也有一个 Subscription ，而且这些订阅器一层层建立起关联，Provider 中的订阅器是最根部的订阅器。如果父组件是一个 connect ，子孙组件也有 connect ，那么父子 connect 的 Subscription 也会建立起父子关系。

上订下发：当 store 中 state 发生改变，会触发 store.subscribe，但是只会通知给 Provider 中的根订阅器，根订阅器不会直接派发更新，而是会下发给子代订阅器（ connect 中的 Subscription ），再由子代订阅器，决定是否更新组件，层层下发

<!-- web 端开发相关 -------------------------------------------------------------- -->

#### web 端开发相关

### pwa 渐进式 Web 应用

- 桌面图标 Web App Manifest：
  Manifest File 是一个配置 JSON 文件，里面包含 PWA 的信息，例如安装到主屏幕上显示的图标、Web 应用的名称和背景色。 如果 Manifest File 存在的话，Chrome 等浏览器会自动激活用于引导用户安装 PWA 应用的提示“添加到主屏幕”
- 离线访问 Service Worker ：指定一些静态资源进行离线缓存。
- 消息推送 Push Api & Notification Api ：让 PWA 应用可以进行消息的推送和通知。

### 浏览器工作原理

浏览器是从单进程时代演变到多进程时代的，单进程时代所有的功能模块都是运行在同一个进程里，某个模块崩溃就会导致整个浏览器崩溃。多进程时代浏览器将模块分配到了不同进程里，进程之间是独立的，通过 IPC 进行通信。主要包括

- 浏览器进程：用户交互，进程管理
- 渲染进程：将 html、css、js 转换为可交互的页面，每个 tab 都有一个渲染进程
- GPU 进程：最开始是为了实现 css 3d 属性的渲染，后面普遍用到了 ui 绘制中
- 网络进程：网络资源加载
- 插件进程：插件运行

### 浏览器插件

inject_script：和普通 js 无差别，不能访问插件 API，不支持跨域
content_script：可以访问 dom，不能访问 js，不支持跨域
popup_script：可以访问绝大部份 API，可以跨域
background_script：可以访问绝大部份 API，生命周期长，可以跨域

<!-- 网络相关 ------------------------------------------------------------ -->

### http

- HTTP/1.0：每个请求/响应对使用一个新的 TCP 连接，缺乏缓存控制和带宽优化机制。

- HTTP/1.1

  - 持久连接：引入了持久连接（Persistent Connections），默认情况下，TCP 连接在多个请求/响应对之间保持打开状态，减少了连接建立和关闭的开销
  - 缓存控制：引入了更细粒度的缓存控制头，如 Cache-Control，提供了更多的缓存策略。

- HTTP/2.0
  - 多路复用：支持多路复用（Multiplexing），允许多个请求和响应在一个 TCP 连接上并行进行，消除了 HTTP/1.x 中的队头阻塞问题。
  - 头部压缩：使用 HPACK 算法对头部进行压缩，减少了头部大小，提高了传输效率

强缓存通过 HTTP 头中的 Expires 和 Cache-Control 字段来控制

- Expires 是一个 HTTP 响应头，指定资源的过期时间，是一个绝对时间。
  例如：Expires: Wed, 21 Oct 2023 07:28:00 GMT
  缺点：由于使用的是绝对时间，客户端和服务器的时间差异可能导致缓存失效。
- Cache-Control 是一个 HTTP 响应头，提供更细粒度的缓存控制，是一个相对时间
  - nocache：指示客户端在使用缓存的响应之前，必须先向服务器验证其有效性，适用于需要频繁更新的资源，确保客户端总是获取最新的内容。
  - nostore：指示客户端和代理服务器不得存储任何关于客户端请求或服务器响应的内容，适用于敏感信息，确保不会在任何地方存储请求或响应的副本

协商缓存是指浏览器在请求资源时，先向服务器发送请求，服务器根据请求头中的缓存标识来决定是否使用缓存的资源。
如果资源没有变化，服务器会返回 304 状态码，浏览器继续使用缓存；否则，服务器会返回新的资源。
Last-Modified 和 If-Modified-Since

### http 和 tcp、udp

HTTP 是应用层，TCP、UDP 是传输层
TCP 有连接（三次握手），有断开（四次挥手），传输稳定
UDP 无连接，无断开不稳定传输，但效率高。如视频会议、语音通话

http：数据以明文形式传输，容易被窃听和篡改
https：通过 SSL/TLS 协议加密数据传输，确保数据的机密性、完整性和身份验证

csrf：跨站请求伪造，用户在受信任的网站登录，获取会话 cookie，用户在登录状态下访问了恶意网站，网站通过表单或图片等方式，向受信任网站发起伪造请求

1. 设置 cookie 等 samesite 属性，限制其他网站携带 cookie
2. referer 验证，确保请求来自受信任的来源

xss：跨站脚本攻击。攻击者通过在网页中注入恶意脚本，使得这些脚本在其他用户的浏览器中执行，从而窃取用户信息、劫持用户会话或执行其他恶意操作

1.  输入验证和转义：对用户输入进行严格的验证和转义，防止恶意脚本注入。
2.  HTTP-only 和 Secure Cookie：设置 Cookie 的 HttpOnly 和 Secure 属性，防止通过 JavaScript 访问 Cookie

### 设计模式

观察者模式和发布订阅模式虽然都涉及到对象之间的通知机制，但它们在实现和使用上有一些关键区别：

- 观察者模式
  直接依赖：观察者直接依赖于被观察者（主题）。观察者需要注册到被观察者中，当被观察者状态改变时，直接通知所有观察者。
  耦合度高：观察者和被观察者之间存在紧密的耦合关系。被观察者需要知道观察者的存在。
  实现方式：通常通过对象的方法调用来实现通知。

- 发布订阅模式
  中介者：发布者和订阅者之间通过一个中介者（消息代理）进行通信。发布者将消息发送到消息代理，订阅者从消息代理接收消息。
  解耦：发布者和订阅者之间没有直接依赖关系。它们不知道彼此的存在，只通过消息代理进行通信。
  实现方式：通常通过事件系统或消息队列来实现。

### 剪映的架构设计

功能拆分
视频转码 - WebAssembly（Wasm） - FFmpeg.js
web-worker
发布订阅模式
