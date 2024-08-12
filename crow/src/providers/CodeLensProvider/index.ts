import { CodeLensProvider, TextDocument, CodeLens, window } from 'vscode';
import * as recast from 'recast';
import { getAST } from './utils';
import { CodeLensModule } from './modules/CodeLensModule';
import SpmCodeLensModule from './modules/spm';
import ArmsCodeLensModule from './modules/arms';
import GoldLogCodeLensModule from './modules/goldlog';
import ProtectionCodeLensModule from './modules/protection';
import PromiseCatchCodeLensModule from './modules/promiseCatch';
import FixCodeLensModule from './modules/fix';
import ExplainCodeLensModule from './modules/explain';
import DocCodeLensModule from './modules/doc';
import { NodePath } from './types';

export default class CrowCodeLensProvider implements CodeLensProvider {
  public modules: { [key: string]: CodeLensModule<any> } = {
    spmCodeLensModule: new SpmCodeLensModule(),
    armsCodeLensModule: new ArmsCodeLensModule(),
    goldLogCodeLensModule: new GoldLogCodeLensModule(),
    protectionCodeLensModule: new ProtectionCodeLensModule(),
    promiseCatchCodeLensModule: new PromiseCatchCodeLensModule(),
    fixCodeLensModule: new FixCodeLensModule(),
    explainCodeLensModule: new ExplainCodeLensModule(),
    docCodeLensModule: new DocCodeLensModule(),
  };
  public codeLensModules: CodeLensModule<any>[] = [];
  private codeLenses: CodeLens[] = [];

  private getQuickOptionsCodeLens(ctx: any, path: NodePath) {
    const fixCodeLenses = ctx.modules.fixCodeLensModule.provide(path);
    const explainCodeLens = ctx.modules.explainCodeLensModule.provide(path);
    const docCodeLens = ctx.modules.docCodeLensModule.provide(path);
    for (const CodeLens of fixCodeLenses) {
      ctx.codeLensModules.push(ctx.modules.fixCodeLensModule);
      ctx.codeLenses.push(CodeLens);
    }
    for (const CodeLens of explainCodeLens) {
      ctx.codeLensModules.push(ctx.modules.explainCodeLensModule);
      ctx.codeLenses.push(CodeLens);
    }
    for (const CodeLens of docCodeLens) {
      ctx.codeLensModules.push(ctx.modules.docCodeLensModule);
      ctx.codeLenses.push(CodeLens);
    }
  }

  provideCodeLenses(document: TextDocument): CodeLens[] {
    this.codeLenses = [];
    this.codeLensModules = [];

    const ctx = this;
    const ast: recast.types.ASTNode = getAST(document.getText());

    recast.visit(ast, {
      visitFunctionDeclaration(path) {
        ctx.getQuickOptionsCodeLens(ctx, path as NodePath);
        this.traverse(path);
      },
      visitArrowFunctionExpression(path) {
        ctx.getQuickOptionsCodeLens(ctx, path as NodePath);
        this.traverse(path);
      },
      visitJSXOpeningElement(path) {
        // data-spm
        const spmCodeLenses = ctx.modules.spmCodeLensModule.provide(path as NodePath);
        for (const spmCodeLens of spmCodeLenses) {
          ctx.codeLensModules.push(ctx.modules.spmCodeLensModule);
          ctx.codeLenses.push(spmCodeLens);
        }
        // goldlog
        const goldLogCodeLenses = ctx.modules.goldLogCodeLensModule.provide(path as NodePath);
        for (const goldLogCodeLense of goldLogCodeLenses) {
          ctx.codeLensModules.push(ctx.modules.goldLogCodeLensModule);
          ctx.codeLenses.push(goldLogCodeLense);
        }
        this.traverse(path);
      },
      visitCallExpression(path) {
        // arms
        const armsCodeLenses = ctx.modules.armsCodeLensModule.provide(path as NodePath);
        for (const armsCodeLense of armsCodeLenses) {
          ctx.codeLensModules.push(ctx.modules.armsCodeLensModule);
          ctx.codeLenses.push(armsCodeLense);
        }
        this.traverse(path);
      },
      visitProgram(path) {
        // protection（只在js下生效，ts下自带检查）
        if (document.languageId === 'javascript' || document.languageId === 'javascriptreact') {
          const protectionCodeLenses = ctx.modules.protectionCodeLensModule.provide(
            path as NodePath,
          );
          for (const protectionCodeLense of protectionCodeLenses) {
            ctx.codeLensModules.push(ctx.modules.protectionCodeLensModule);
            ctx.codeLenses.push(protectionCodeLense);
          }
        }

        // promiseCatch
        const promiseCatchCodeLenses = ctx.modules.promiseCatchCodeLensModule.provide(
          path as NodePath,
        );
        for (const promiseCatchCodeLens of promiseCatchCodeLenses) {
          ctx.codeLensModules.push(ctx.modules.promiseCatchCodeLensModule);
          ctx.codeLenses.push(promiseCatchCodeLens);
        }

        this.traverse(path);
      },
    });

    return this.codeLenses;
  }

  resolveCodeLens(codeLens: CodeLens): CodeLens {
    const index = this.codeLenses.indexOf(codeLens);
    const codeLensModule = this.codeLensModules[index];
    return codeLensModule.resolve(codeLens);
  }
}
