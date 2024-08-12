import { Range, window, CodeLens } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import * as recast from 'recast';
import { getAST, n, b, createRange, padIndent, trimIndent, AdvancedRange } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';

export default class PromiseCatchCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = 'crowCopilot.promiseCatch';

  public commandHandler(range: AdvancedRange) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const code = padIndent(editor.document.getText(range), range.indent);

    const ast = getAST(code);

    recast.visit(ast, {
      visitCallExpression(path) {
        const node = path.node;
        if (
          n.MemberExpression.check(node.callee) &&
          n.Identifier.check(node.callee.property) &&
          node.callee.property.name === 'then'
        ) {
          let isArrowFunction = false;
          if (node.arguments[0].type === 'ArrowFunctionExpression') {
            isArrowFunction = true;
          }

          const throwErrStatement = b.expressionStatement(
            b.callExpression(b.memberExpression(b.identifier('console'), b.identifier('log')), [
              b.identifier('err'),
            ]),
          );

          const func = isArrowFunction
            ? b.arrowFunctionExpression(
                [b.identifier('err')],
                b.blockStatement([throwErrStatement]),
              )
            : b.functionExpression(
                null,
                [b.identifier('err')],
                b.blockStatement([throwErrStatement]),
              );

          const catchFunc = b.memberExpression(node, b.identifier('catch'));
          const newFunc = b.callExpression(catchFunc, [func]);

          path.replace(newFunc);
        }
        this.abort();
      },
    });
    const output = trimIndent(recast.print(ast).code, range.indent);

    // 替换编辑器中的文本
    editor.edit((editBuilder) => {
      editBuilder.replace(range, output);
    });
  }

  public provide(path: NodePath) {
    const codeLenses: CodeLens[] = [];
    const rootNode = path.scope.node as recast.types.ASTNode;

    // 判断是否是否处于同一行
    const hasTheSameLine = (inputLens: CodeLens): boolean => {
      const { start } = inputLens.range;
      const line = start.line;

      let flag = false;
      for (const codeLens of codeLenses) {
        const { start: itemStart } = codeLens.range;
        if (itemStart.line === line) {
          flag = true;
          break;
        }
      }

      return flag;
    };

    recast.visit(rootNode, {
      visitCallExpression(path) {
        const node = path.node as recast.types.namedTypes.CallExpression;
        if (node.loc) {
          const codeLens = new CodeLens(createRange(node.loc));
          if (
            n.MemberExpression.check(node.callee) &&
            n.Identifier.check(node.callee.property) &&
            node.callee.property.name === 'then' &&
            (node.arguments[0].type === 'ArrowFunctionExpression' ||
              node.arguments[0].type === 'FunctionExpression') &&
            path.parentPath.node?.property?.name !== 'catch' &&
            path.parentPath.node?.property?.name !== 'then' &&
            !hasTheSameLine(codeLens)
          ) {
            codeLenses.push(codeLens);
          }
          this.traverse(path);
        }
      },
    });

    return codeLenses;
  }

  public resolve(codeLens: CodeLens) {
    codeLens.command = {
      title: '添加catch',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
