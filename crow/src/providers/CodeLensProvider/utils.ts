import { Position, Range } from 'vscode';
import * as recast from 'recast';
import * as TSParser from 'recast/parsers/babel-ts';
import { SourceLocation } from './types';

export class AdvancedRange extends Range {
  indent: number;

  constructor(start: Position, end: Position, indent: number) {
    super(start, end);
    this.indent = indent;
  }
}

// 获取语法树
export const getAST = (code: string) => {
  return recast.parse(code, {
    parser: TSParser,
  });
};

export const n = recast.types.namedTypes;
export const b = recast.types.builders;

/**
 * 解析后的 loc 初始位置 { line: 1, column: 0, index: 0 }
 * line 是从 1 开始计数，column 和 index 从 0 开始，后续换算需要注意下
 */
export function createRange(startLoc: SourceLocation, endLoc?: SourceLocation) {
  const _endLoc = endLoc || startLoc;
  // The zero-based line value & character value.
  const startPosition = new Position(startLoc.start.line - 1, startLoc.start.column);
  const endPosition = new Position(_endLoc.end.line - 1, _endLoc.end.column);
  return new AdvancedRange(startPosition, endPosition, startLoc.indent || 0);
}

// 添加指定数量的缩进空格
export function padIndent(text: string, indent: number) {
  const indentStr = new Array(indent).fill(' ').join('');
  return indentStr + text;
}

// 移除指定数量的缩进空格
export function trimIndent(text: string, indent: number) {
  return text.slice(indent);
}

export function isBuiltinObject(name: string) {
  const builtinObjects = [
    'eval',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'Array',
    'Date',
    'RegExp',
    'Promise',
    'Proxy',
    'Map',
    'WeakMap',
    'Set',
    'WeakSet',
    'Function',
    'Boolean',
    'String',
    'Number',
    'Symbol',
    'Object',
    'Error',
    'Math',
    'JSON',
    'console',
    'exports',
    'window',
  ];
  return name && builtinObjects.includes(name);
}
