import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

const excludes = ['node_modules', '.git', '.vscode', '.langchain', 'dist', 'build', 'lib'];

async function getDirectoryStructure(
  dir: string,
  pathParts: string[] = [],
): Promise<{ name: string; path: string }[]> {
  const files = await fs.readdir(dir);

  const result: { name: string; path: string }[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.lstat(filePath);

    if (excludes.some((exclude) => stats.isDirectory() && filePath.includes(exclude))) {
      continue;
    }

    const fullPath = pathParts.concat(file).join(path.sep);

    if (stats.isDirectory()) {
      const children = await getDirectoryStructure(filePath, [...pathParts, file]);
      result.push(...children);
    } else {
      result.push({ name: file, path: fullPath });
    }
  }

  return result;
}

export async function getCategory() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders) {
    const workspaceFolder = workspaceFolders[0].uri.fsPath;
    const directoryStructure = await getDirectoryStructure(workspaceFolder);
    return directoryStructure;
  }

  return [];
}
