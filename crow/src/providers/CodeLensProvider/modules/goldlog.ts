import { Range, window, CodeLens } from 'vscode';
import * as recast from 'recast';
import { CodeLensModule } from './CodeLensModule';
import { SourceLocation, NodePath, Scope } from '../types';
import { getAST, n, b, createRange, AdvancedRange, padIndent, trimIndent } from '../utils';
import { Logger } from '../../../utilities/logger';

// 获取 onClick 属性
const getOnClickAttr = (node: recast.types.namedTypes.JSXOpeningElement) => {
  const classNameAttr = node.attributes?.find(
    (attr) => n.JSXAttribute.check(attr) && attr.name.name === 'onClick',
  ) as recast.types.namedTypes.JSXAttribute;
  return classNameAttr;
};

// 检测表达式内部是否使用了 goldlog
function existGoldlogCode(blockStatement: any) {
  const { existImport, specifierImport, defaultSpecifierImportName, importSpecifierName } =
    resolveImport(window.activeTextEditor!.document.getText());
  if (!existImport) {
    return false;
  }

  let existGoldlogCall = false;
  recast.visit(blockStatement, {
    visitCallExpression(p) {
      if (specifierImport) {
        if (n.Identifier.check(p.node.callee) && p.node.callee.name === importSpecifierName) {
          existGoldlogCall = true;
        }
      } else {
        if (
          n.MemberExpression.check(p.node.callee) &&
          n.Identifier.check(p.node.callee.property) &&
          n.Identifier.check(p.node.callee.object) &&
          p.node.callee.object.name === defaultSpecifierImportName &&
          p.node.callee.property.name === importSpecifierName
        ) {
          existGoldlogCall = true;
        }
      }
      this.abort();
    },
  });
  return existGoldlogCall;
}

const findFunctionDeclarationLoc = (path: NodePath, functionName: string) => {
  let loc: SourceLocation | undefined;
  let currentScope: Scope = path.scope;

  while (!loc) {
    recast.visit(currentScope.node, {
      visitFunctionDeclaration(path) {
        // function onViewClick() {
        // }
        // <View onClick={ onViewClick } />
        const { id } = path.node;
        if (n.Identifier.check(id) && id.name === functionName) {
          // 检测内部是否已经使用了 goldlog
          const exist = existGoldlogCode(path.node);
          if (!exist) {
            loc = path.node.loc!;
          }
          this.abort();
        }
        this.traverse(path);
      },
      visitDeclaration(path) {
        // const onViewClick = () => {
        // }
        // <View onClick={ onViewClick } />
        if (n.VariableDeclaration.check(path.node)) {
          const declarator = path.node.declarations[0];
          if (
            n.VariableDeclarator.check(declarator) &&
            n.Identifier.check(declarator.id) &&
            declarator.id.name === functionName
          ) {
            // 检测内部是否已经使用了 goldlog
            const exist = existGoldlogCode(path.node);
            if (!exist) {
              loc = path.node.loc!;
            }
            this.abort();
          }
        }
        this.traverse(path);
      },
    });
    if (currentScope.isGlobal) {
      break;
    } else {
      // 继续向上级作用域寻找
      currentScope = currentScope.parent;
    }
  }

  return loc;
};

// 解析 import
function resolveImport(code: string) {
  // 判断是否存在对应的 import
  const ast = getAST(code);
  // 是否存在 import 语句
  let existImport = false;
  // 是否存在 import {} 语句
  let specifierImport = false;
  let existSpecifierImport = false;
  // import default 方式对应的变量名
  let defaultSpecifierImportName: string | undefined;
  // import { goldlog } 方式对应的变量名
  let importSpecifierName = 'goldlog';
  const importFromName = 'pcom-chaoshi-utils';

  recast.visit(ast, {
    visitImportDeclaration(path) {
      if (
        n.Literal.check(path.node.source) &&
        (path.node.source.value as string).includes(importFromName)
      ) {
        existImport = true;
        if (path.node.specifiers && path.node.specifiers.length > 0) {
          // import { createElement } from 'rax'
          // recast.types.namedTypes.ImportSpecifier
          // import * as recast from 'recast';
          // recast.types.namedTypes.ImportNamespaceSpecifier
          // import react from 'react'
          // recast.types.namedTypes.ImportDefaultSpecifier)[]
          for (const specifier of path.node.specifiers) {
            if (n.ImportDefaultSpecifier.check(specifier)) {
              if (n.Identifier.check(specifier.local) && specifier.local.name) {
                defaultSpecifierImportName = specifier.local.name;
                existSpecifierImport = true;
              }
              this.abort();
            } else if (n.ImportSpecifier.check(specifier)) {
              specifierImport = true;
              if (
                specifier.imported.name === importSpecifierName &&
                n.Identifier.check(specifier.local) &&
                specifier.local.name
              ) {
                importSpecifierName = specifier.local.name;
                existSpecifierImport = true;
              }
              this.abort();
            }
          }
        } else {
          specifierImport = true;
        }
      }
      this.traverse(path);
    },
  });

  if (!existImport) {
    specifierImport = true;
  }

  return {
    existImport,
    existSpecifierImport,
    specifierImport,
    defaultSpecifierImportName,
    importSpecifierName,
    importFromName,
  };
}

// 根据 import 创造表达式
function createCallExpressionStatement({
  specifierImport,
  defaultSpecifierImportName,
  importSpecifierName,
}: {
  specifierImport: boolean;
  defaultSpecifierImportName: string;
  importSpecifierName: string;
}) {
  const isMember = !specifierImport;
  if (isMember) {
    return b.expressionStatement(
      b.callExpression(
        b.memberExpression(
          b.identifier(defaultSpecifierImportName),
          b.identifier(importSpecifierName),
        ),
        [
          b.stringLiteral('/your_goldlog_key'),
          b.stringLiteral('CLK'),
          b.templateLiteral(
            [
              b.templateElement({ raw: 'spm=', cooked: 'spm=' }, false),
              b.templateElement({ raw: '', cooked: '' }, true),
            ],
            [b.stringLiteral('spm')],
          ),
          b.stringLiteral('POST'),
        ],
      ),
    );
  } else {
    return b.expressionStatement(
      b.callExpression(b.identifier(importSpecifierName), [
        b.stringLiteral('/your_goldlog_key'),
        b.stringLiteral('CLK'),
        b.templateLiteral(
          [
            b.templateElement({ raw: 'spm=', cooked: 'spm=' }, false),
            b.templateElement({ raw: '', cooked: '' }, true),
          ],
          [b.stringLiteral('spm')],
        ),
        b.stringLiteral('POST'),
      ]),
    );
  }
}

// 添加黄金令箭
function appendGoldLog(code: string, expr: recast.types.namedTypes.ExpressionStatement) {
  const ast = getAST(code);

  const comment = b.commentBlock(
    ' TODO\n每个点击埋点都需要对应一个曝光埋点\n请合理发送对应的曝光黄金令箭或者 SPM\n如果已经设置了曝光 SPM 或者发送对应的曝光令箭，可以删除此注释 ',
  );
  expr.comments = [comment];

  recast.types.visit(ast, {
    visitFunctionDeclaration(path) {
      const body = path.get('body', 'body');
      body.unshift(expr);
      this.abort();
    },
    visitArrowFunctionExpression(path) {
      const body = path.get('body', 'body');
      body.unshift(expr);
      this.abort();
    },
  });

  return recast.print(ast, { quote: 'single' }).code;
}

export default class GoldLogCodeLensModule extends CodeLensModule<[Range], NodePath> {
  public command = 'crowCopilot.addGoldLog';

  public commandHandler(range: AdvancedRange) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    // 解析 import
    const {
      existImport,
      existSpecifierImport,
      specifierImport,
      defaultSpecifierImportName,
      importSpecifierName,
      importFromName,
    } = resolveImport(editor.document.getText());

    const expressionStatement = createCallExpressionStatement({
      specifierImport,
      defaultSpecifierImportName: defaultSpecifierImportName!,
      importSpecifierName,
    });

    // 确定要修改的代码范围
    const text = padIndent(editor.document.getText(range), range.indent);

    // 解析并添加黄金令箭
    const modifiedText = trimIndent(appendGoldLog(text, expressionStatement), range.indent);

    // 替换编辑器中的文本
    editor
      .edit((editBuilder) => {
        editBuilder.replace(range, modifiedText);
      })
      .then(() => {
        if (!existImport) {
          // 创造 import
          const ast = getAST(editor.document.getText());

          const importStatement = b.importDeclaration(
            [b.importSpecifier(b.identifier(importSpecifierName))],
            b.literal(importFromName),
          );
          ast.program.body.unshift(importStatement);

          const codeStr = recast.print(ast, { quote: 'single' }).code;
          const document = editor.document;
          const fullRange = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
          );
          editor.edit((editBuilder) => {
            editBuilder.replace(fullRange, codeStr);
          });
        } else if (!existSpecifierImport) {
          // 补充 import
          const ast = getAST(editor.document.getText());

          recast.visit(ast, {
            visitImportDeclaration(path) {
              if (n.Literal.check(path.node.source) && path.node.source.value === importFromName) {
                const goldlogSpecifier = b.importSpecifier(b.identifier(importSpecifierName));
                if (path.node.specifiers) {
                  path.node.specifiers.push(goldlogSpecifier);
                }
              }

              this.traverse(path);
            },
          });

          const codeStr = recast.print(ast, { quote: 'single' }).code;
          const document = editor.document;
          const fullRange = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
          );
          editor.edit((editBuilder) => {
            editBuilder.replace(fullRange, codeStr);
          });
        }
      });
  }

  public provide(path: NodePath) {
    const codeLenses: CodeLens[] = [];
    const openingElement = path.node as recast.types.namedTypes.JSXOpeningElement;
    // 获取到 onClick 属性
    const onClickAttr = getOnClickAttr(openingElement);
    if (onClickAttr) {
      // 判断 onClick 对应的值，是否是表达式
      if (n.JSXExpressionContainer.check(onClickAttr.value)) {
        const { expression } = onClickAttr.value;
        // 如果是变量，需要找到对应的方法声明位置
        if (n.Identifier.check(expression)) {
          // <View onClick={onViewClick}></View>
          const onClickMethodName = expression.name;
          const loc = findFunctionDeclarationLoc(path, onClickMethodName);
          if (loc) {
            const codeLens = new CodeLens(createRange(loc));
            codeLenses.push(codeLens);
          }
        } else if (n.ArrowFunctionExpression.check(expression)) {
          // 检测内部是否已经使用了 goldlog
          const exist = existGoldlogCode(path.node);
          // <View onClick={() => { }></View>
          if (!exist) {
            const codeLens = new CodeLens(createRange(expression.loc!));
            codeLenses.push(codeLens);
          }
        }
      }
    }
    return codeLenses;
  }

  public resolve(codeLens: CodeLens): CodeLens {
    codeLens.command = {
      title: '添加黄金令箭',
      command: this.command,
      arguments: [codeLens.range],
    };
    return codeLens;
  }
}
