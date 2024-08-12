import { Range, window, CodeLens } from 'vscode';
import * as recast from 'recast';
import { CodeLensModule } from './CodeLensModule';
import { SourceLocation, NodePath } from '../types';
import { getAST, n, b, createRange, AdvancedRange, padIndent, trimIndent } from '../utils';
import { Logger } from '../../../utilities/logger';

// 判断是否是 Link 组件
const isLinkTag = (node: recast.types.namedTypes.JSXOpeningElement) => {
  return n.JSXIdentifier.check(node.name) && node.name.name === 'Link';
};

// 判断是否是 mui-zebra-module 或者 auto-exp-item 的类名节点
const isAplusClassTag = (node: recast.types.namedTypes.JSXOpeningElement) => {
  const classNameAttr = node.attributes?.find(
    (attr) => n.JSXAttribute.check(attr) && attr.name.name === 'className',
  ) as recast.types.namedTypes.JSXAttribute;

  if (classNameAttr && classNameAttr.value) {
    if (n.Literal.check(classNameAttr.value) && typeof classNameAttr.value.value === 'string') {
      const classNames = classNameAttr.value.value.split(' ');
      return (
        classNames.indexOf('mui-zebra-module') >= 0 || classNames.indexOf('auto-exp-item') >= 0
      );
    }
  }
  return false;
};

// 判断是否存在 data-spm 属性
const hasDataSpmAttr = (node: recast.types.namedTypes.JSXOpeningElement) => {
  return !!node.attributes?.some(
    (attr) => n.JSXAttribute.check(attr) && attr.name.name === 'data-spm',
  );
};

// 添加 data-spm 属性
function appendDataSpmAttr(code: string) {
  const ast = getAST(code);

  recast.types.visit(ast, {
    visitJSXOpeningElement(path) {
      const openingElement = path.node;
      if (
        (isLinkTag(openingElement) || isAplusClassTag(openingElement)) &&
        !hasDataSpmAttr(openingElement)
      ) {
        const dataSpmAttr = b.jsxAttribute(
          b.jsxIdentifier('data-spm'),
          b.stringLiteral('spm_value'),
          // 以下是模板字符串
          // b.jsxExpressionContainer(
          //   b.templateLiteral(
          //     [
          //       b.templateElement({ raw: 'd', cooked: 'd' }, false),
          //       b.templateElement({ raw: '', cooked: '' }, true),
          //     ],
          //     [
          //       b.stringLiteral('your_value'),
          //     ]
          //   ),
          // ),
        );
        openingElement.attributes!.push(dataSpmAttr);
        this.abort();
      }
      this.traverse(path);
    },
  });

  return recast.print(ast).code;
}

export default class SpmCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command = 'crowCopilot.addSpmAttribute';

  public commandHandler(range: AdvancedRange) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    // 确定要添加属性的 JSX 元素的范围
    // 需要包括缩进空格字符，否则会影响输出格式
    const text = padIndent(editor.document.getText(range), range.indent);

    // 解析并添加 data-spm 属性
    const modifiedText = trimIndent(appendDataSpmAttr(text), range.indent);

    // 替换编辑器中的文本
    editor.edit((editBuilder) => {
      editBuilder.replace(range, modifiedText);
    });
  }

  public provide(path: NodePath) {
    const codeLenses: CodeLens[] = [];
    const openingElement = path.node as recast.types.namedTypes.JSXOpeningElement;
    if (
      (isLinkTag(openingElement) || isAplusClassTag(openingElement)) &&
      !hasDataSpmAttr(openingElement)
    ) {
      // 需要找到对应的闭合节点，然后确定返回
      const startLoc: SourceLocation = openingElement.loc!;
      const endLoc: SourceLocation = openingElement.selfClosing
        ? startLoc
        : path.parentPath.node.closingElement.loc;
      const codeLens = new CodeLens(createRange(startLoc, endLoc));
      codeLenses.push(codeLens);
    }
    return codeLenses;
  }

  public resolve(codeLens: CodeLens): CodeLens {
    codeLens.command = {
      title: '添加 data-spm',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
