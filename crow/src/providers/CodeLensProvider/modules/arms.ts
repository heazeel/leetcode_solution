import { Range, window, CodeLens, Uri, env } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import * as recast from 'recast';
import { getAST, n, createRange } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';

// 暂时不解析 import，写死识别 tesRecord 调用
const isFuncCall = (callee: recast.types.namedTypes.Expression) =>
  n.Identifier.check(callee) && callee.name === 'tesRecord';

const isMemberCall = (callee: recast.types.namedTypes.Expression) =>
  n.MemberExpression.check(callee) &&
  n.Identifier.check(callee.object) &&
  n.Identifier.check(callee.property) &&
  callee.property.name === 'tesRecord';

// 用增的告警单独处理
const isGrowApiCall = (callee: recast.types.namedTypes.Expression) =>
  (n.Identifier.check(callee) && callee.name === 'requestGrowthApi') ||
  (n.MemberExpression.check(callee) &&
    n.Identifier.check(callee.object) &&
    n.Identifier.check(callee.property) &&
    callee.property.name === 'requestGrowthApi');

function removeQuotes(input: string = ''): string {
  if (input.startsWith('"') && input.endsWith('"')) {
    // 去除双引号
    return input.slice(1, -1);
  } else if (input.startsWith("'") && input.endsWith("'")) {
    // 去除单引号
    return input.slice(1, -1);
  }
  return input;
}

export default class ArmsCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = 'crowCopilot.configArms';

  public commandHandler(range: Range) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    // 确定要添加属性的 JSX 元素的范围
    const code = editor.document.getText(range);

    const ast = getAST(code);
    let params: any;
    let defaultItem: any;

    recast.types.visit(ast, {
      visitCallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (isFuncCall(callee) || isMemberCall(callee)) {
          // [''serverError'', ''brand-item-smart'', ''商品模块隐藏'', '{ moduleId, data }']
          params = args.map((arg) => recast.print(arg).code);
          this.abort();
        }

        if (isGrowApiCall(callee)) {
          defaultItem = JSON.parse(
            JSON.stringify(ArmsTemplates.find((temp) => temp.tempName === '用增')!),
          );
          params = [, '{COMMON|CENTER}-{appId}-{action}'];
        }
        this.traverse(path);
      },
    });

    // 添加告警配置
    (async function () {
      let template;
      if (defaultItem) {
        template = defaultItem;
      } else {
        const selectedItem = await window.showQuickPick(ArmsTemplates.map((t) => t.tempName));
        template = JSON.parse(
          JSON.stringify(ArmsTemplates.find((temp) => temp.tempName === selectedItem)!),
        );
      }
      const [, msg] = params || [];
      // 自动带上 msg 信息
      template.rule.custom[0].and[0]['=='][1] = removeQuotes(msg);
      await env.clipboard.writeText(JSON.stringify(template));
      const linkUrl = `https://test.com/arms/alarm/config/detail/old?code=${template.code}&copy=1&pageType=add&pid=tmcs&ruleType=4`;
      env.openExternal(Uri.parse(linkUrl));
    })();
  }

  public provide(path: NodePath) {
    const codeLenses: CodeLens[] = [];
    const { callee, loc } = path.node as recast.types.namedTypes.CallExpression;
    if (isFuncCall(callee) || isMemberCall(callee) || isGrowApiCall(callee)) {
      const codeLens = new CodeLens(createRange(loc!));
      codeLenses.push(codeLens);
    }
    return codeLenses;
  }

  public resolve(codeLens: CodeLens) {
    codeLens.command = {
      title: '配置 Arms 告警',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}

const BaseTemplate = {
  id: 1,
  pid: 'tmcs',
  code: '11',
  url: '*',
  rule: {
    custom: [
      {
        and: [{ '==': [{ var: 'msg' }, ''] }],
      },
    ],
    logic: [
      { and: [{ '>': [{ var: '5+uid_cnt+1' }, '20'] }] },
      { and: [{ '>': [{ var: '5+uid_cnt+7' }, '1.2'] }] },
      { and: [{ '>': [{ var: '5+uid_cnt+6' }, '1.2'] }] },
    ],
  },
  ruleType: 4,
  silentPeriod: 1,
  level: 1,
};

const ArmsTemplates = [
  {
    ...BaseTemplate,
    tempName: '首页',
    name: '猫超前端-首页-',
    ding: '246109',
    dingGroup: 'eb678047cab135a62079a292c17f3d331547e161dbb7076e389d4baa230a31c3',
  },
  {
    ...BaseTemplate,
    tempName: '用增',
    name: '猫超前端-用增-',
    ding: '77598,404195,394858',
    dingGroup: 'ac5cd5d1873ab5e4250ae60c4454a9109eb6c2633ac24c046804391d844326ba',
  },
  {
    ...BaseTemplate,
    tempName: '导购',
    name: '猫超前端-导购-',
    ding: '391453,333530,246109,414828,222030',
    dingGroup: 'e8c49b973738c8fa87f67396f6e83bf93a86c8b0163e674c47ee11113f78df11',
  },
  {
    ...BaseTemplate,
    tempName: '品牌馆',
    name: '猫超前端-品牌馆-',
    ding: '311412',
    dingGroup: '0293e2cc33d6d6ff39b8da2ade01600d1e700bc4161a5199375cdc8f0bd77ea3',
  },
  {
    ...BaseTemplate,
    tempName: '直播',
    name: '猫超前端-直播-',
    ding: '77913,107981',
    dingGroup: '93eb0a99eafe6fbccae5599ee29b2f6b7c739e5251428bb4450cb71aae611458',
  },
  {
    ...BaseTemplate,
    tempName: '会场',
    name: '猫超前端-会场-',
    ding: '77913,107981',
    dingGroup: 'f24e32f9e02a47e9c2232c7f9fb97bfa347891014b440ef71c88922e0d684645',
  },
  {
    ...BaseTemplate,
    tempName: '基础链路',
    code: 'tcbase',
    name: '基础链路-',
    ding: '206925,393258,210241',
    dingGroup: 'b6318aa02fe72f03eded8d7d6d20088fcf0a174de6bec25face4946545903edb',
  },
  {
    ...BaseTemplate,
    tempName: '新-基础链路',
    code: 'tmcsbase',
    name: '基础链路-',
    ding: '206925,393258,210241',
    dingGroup: 'b6318aa02fe72f03eded8d7d6d20088fcf0a174de6bec25face4946545903edb',
  },
];
