import vscode, { window } from 'vscode';
import fs from 'fs';
import path from 'path';
import * as recast from 'recast';
import { getAST } from '../CodeLensProvider/utils';
import { getCurrentWorkspace } from '../../timeMachine/utils';

const defaultExtension = ['.js', '.jsx', '.ts', '.tsx'];

// 获取当前样式文件所在的文件夹目录
export const getFilename = () => {
  const editor = window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const fsPath = document.uri.fsPath;
    const dirPath = path.dirname(fsPath);
    const files = getValidFile(dirPath);
    const resolvePaths = files.map((file) => {
      return path.resolve(dirPath, file);
    });
    return resolvePaths || [];
  }
  return [];
};

// 获取所有className中的内容
export const getClassNames = (filesPath: string[]) => {
  let classNames: string[] = [];
  try {
    if (!Array.isArray(filesPath)) return [];
    filesPath.map((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast: recast.types.ASTNode = getAST(content);
      recast.visit(ast, {
        visitJSXOpeningElement(path: any) {
          const classNameAttr = path.node.attributes.find(
            (attr: any) => attr?.name?.name === 'className',
          );
          // ssr场景下styles内的css
          if (classNameAttr && classNameAttr.value) {
            if (classNameAttr.value.type === 'JSXExpressionContainer') {
              const expression = classNameAttr.value.expression;
              if (expression.type === 'MemberExpression') {
                const objectName = expression.object.name;
                const className = expression.property.name || expression.property.value;
                if (objectName === 'styles' && !!className) {
                  classNames.push(className);
                }
                // 新增处理对象字面量的情况
              } else if (expression.type === 'ObjectExpression') {
                expression.properties.forEach((prop: any) => {
                  if (prop.type === 'ObjectProperty') {
                    if (prop.key.type === 'Identifier') {
                      const className = prop.key?.name;
                      classNames.push(className);
                    } else if (prop.key.type === 'StringLiteral') {
                      const className = prop.key?.value;
                      classNames.push(className);
                    }
                  }
                });
              } else if (
                expression.type === 'ConditionalExpression' &&
                expression.consequent.type === 'StringLiteral' &&
                expression.alternate.type === 'StringLiteral'
              ) {
                classNames.push(expression.consequent.value, expression.alternate.value);
              } else if (
                expression.type === 'StringLiteral' ||
                expression.type === 'TemplateLiteral'
              ) {
                classNames.push(expression.value);
              }
            } else if (classNameAttr.value.type === 'StringLiteral') {
              const className = classNameAttr.value.value;
              const names = dealClassNames(className);
              classNames = classNames.concat(names);
            }
          }
          this.traverse(path); // 继续访问子节点
        },
      });
    });
  } catch (err) {
    console.log(err);
  }
  // 去重
  const uniqueArray = [...new Set(classNames)];
  const resultArray = [];
  const editor = window.activeTextEditor;
  if (editor) {
    try {
      const document = editor.document;
      const fsPath = document.uri.fsPath;
      const fileContent = fs.readFileSync(fsPath, 'utf-8');
      // 遍历类名数组
      for (let className of uniqueArray) {
        const regex = new RegExp(`\\.${className}`, 'g');
        const match = regex.test(fileContent);
        if (!match && !!className) {
          resultArray.push(className);
        }
      }
    } catch (error) {}
  }
  return resultArray;
};

// 处理className
const dealClassNames = (classNames: string) => {
  const classNameSplit = classNames.split(' ');
  return classNameSplit;
};

// 获取合法后缀名
const getValidFile = (dirPath: string) => {
  const files: string[] = [];
  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);
    const isFile = fs.statSync(filePath).isFile();
    if (isFile) {
      const extname = path.extname(file);
      if (defaultExtension.includes(extname)) {
        files.push(file);
      }
    }
  });
  return files;
};

// 查找package.json
const findPackageJson = () => {
  const activeEditor = vscode.window.activeTextEditor;
  const filePath = activeEditor?.document.fileName;
  if (filePath) {
    const workspacePath = getCurrentWorkspace();
    let dirToSearch = path.dirname(filePath);
    while (true) {
      const packageJsonPath = path.join(dirToSearch, 'package.json');
      try {
        // 如果找到，返回该路径
        if (fs.existsSync(packageJsonPath)) {
          return packageJsonPath;
        } else {
          if (dirToSearch === workspacePath) break;
          dirToSearch = path.dirname(dirToSearch);
        }
      } catch (err) {
        break;
      }
    }

    return null;
  }
};

// 获取依赖
export const getDependencies = () => {
  const packageFilePath = findPackageJson();
  if (packageFilePath) {
    const content = fs.readFileSync(packageFilePath, 'utf8');
    const jsonContent = JSON.parse(content);
    const dependencies = [
      ...Object.keys(jsonContent.dependencies || {}),
      ...Object.keys(jsonContent.devDependencies || {}),
    ];
    const finalArr = dependencies.map((item) => {
      const dependenceSplit = item.split('/');
      const dependenceName = dependenceSplit[dependenceSplit.length - 1];
      const dealName = dependenceName.split('-');
      const lastName = dealName[dealName.length - 1];
      const name = lastName.charAt(0).toUpperCase() + lastName.slice(1);
      return {
        dependence: item,
        name,
      };
    });

    return finalArr;
  }
  return [];
};
