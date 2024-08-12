import { Range, window, CodeLens } from 'vscode';
import { CodeLensModule } from './CodeLensModule';
import * as recast from 'recast';
import { getAST, n, b, createRange, isBuiltinObject } from '../utils';
import { NodePath } from '../types';
import { Logger } from '../../../utilities/logger';

// 判断是否import
function determineImport(ast: recast.types.ASTNode, importName: string): boolean {
  let isImported = false;
  recast.visit(ast, {
    visitImportDeclaration(path) {
      const node = path.node as recast.types.namedTypes.ImportDeclaration;
      if (node.specifiers) {
        const writeRes = () => {
          isImported = true;
          this.abort();
        };

        for (const specifier of node.specifiers) {
          const localName = specifier.local?.name;
          // 匹配：import a from 'b'
          if (n.ImportDefaultSpecifier.check(specifier) && localName === importName) {
            writeRes();
            break;
          }

          // 匹配：import { a } from 'b'
          // 匹配：import { a as b } from 'c'
          if (n.ImportSpecifier.check(specifier) && localName === importName) {
            writeRes();
            break;
          }

          // 匹配：import * as a from 'b'
          if (n.ImportNamespaceSpecifier.check(specifier) && localName === importName) {
            writeRes();
            break;
          }
        }
      }
      this.traverse(path);
    },
  });

  return isImported;
}

export default class ProtectionCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command: string = 'crowCopilot.fieldProtection';

  public commandHandler(range: Range) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const code = editor.document.getText(range);

    const ast = getAST(code);
    recast.visit(ast, {
      visitVariableDeclarator(path) {
        const node = path.node as recast.types.namedTypes.VariableDeclarator;
        if (n.ObjectPattern.check(node.id)) {
          // 如果解构的对象没有空值保护，添加空值保护
          if (node.init && !n.LogicalExpression.check(node.init)) {
            node.init = b.logicalExpression('||', node.init, b.objectExpression([]));
          }
        }
        this.traverse(path);
      },
      // visitMemberExpression(path) {
      //   const node = path.node as recast.types.namedTypes.MemberExpression;
      //   if (n.Identifier.check(node.object)) {
      //     const newNode = b.optionalMemberExpression(node.object, node.property, node.computed);
      //     path.replace(newNode);
      //   }
      //   this.traverse(path);
      // },
    });
    const output = recast.print(ast).code;

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
      visitVariableDeclaration(path) {
        const node = path.node as recast.types.namedTypes.VariableDeclaration;

        if (node.loc) {
          const codeLens = new CodeLens(createRange(node.loc));
          const declarator = node.declarations[0];
          if (
            n.VariableDeclarator.check(declarator) &&
            n.ObjectPattern.check(declarator.id) &&
            !n.LogicalExpression.check(declarator.init) &&
            !hasTheSameLine(codeLens)
          ) {
            // 匹配：const { a, b } = c --> const { a, b } = c || {};
            if (
              n.Identifier.check(declarator.init) &&
              !determineImport(rootNode, declarator.init.name)
            ) {
              codeLenses.push(codeLens);
            }
            // 匹配：const { a, b } = c.d --> const { a, b } = c.d || {};
            if (n.MemberExpression.check(declarator.init)) {
              codeLenses.push(codeLens);
            }
          }
        }

        this.traverse(path);
      },
      // visitMemberExpression(path) {
      //   const node = path.node as recast.types.namedTypes.MemberExpression;
      //   if (
      //     !node.optional &&
      //     n.Identifier.check(node.object) &&
      //     !isBuiltinObject(node.object.name) &&
      //     !determineImport(rootNode, node.object.name)
      //   ) {
      //     const codeLens = new CodeLens(createRange(node.loc!));
      //     if (!hasTheSameLine(codeLens)) {
      //       codeLenses.push(codeLens);
      //     }
      //   }
      //   this.traverse(path);
      // },
    });

    return codeLenses;
  }

  public resolve(codeLens: CodeLens) {
    codeLens.command = {
      title: '字段保护',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
