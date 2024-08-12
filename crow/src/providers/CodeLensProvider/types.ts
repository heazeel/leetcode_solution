import * as recast from 'recast';

export interface SourceLocation extends recast.types.namedTypes.SourceLocation {
  indent?: number;
}

export type NodePath = recast.types.NodePath;

export interface Scope {
  isGlobal: boolean;
  depth: number;
  path: NodePath;
  node: recast.types.ASTNode;
  parent: Scope;
}
