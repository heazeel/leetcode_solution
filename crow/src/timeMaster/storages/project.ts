import { workspace, WorkspaceFolder } from 'vscode';
import fse from 'fs-extra';
import path from 'path';
import { getGitInfo as originGetGitInfo, GitInfo } from '@appworks/project-utils/lib/git';
import { UNTITLED, NO_PROJ_NAME } from '../constants';
import { jsonSpaces } from '../config';
import { getStorageDayPath } from '../utils/storage';

import NodeCache from 'node-cache';

const nodeCache = new NodeCache({ stdTTL: 120 });
const cacheTimeoutSeconds = 60 * 30;

interface ProjectResource {
  gitRepository: PropType<GitInfo, 'repository'>;
  gitBranch: PropType<GitInfo, 'branch'>;
  gitTag?: PropType<GitInfo, 'tag'>;
}

async function getGitInfo(dirPath: string): Promise<any> {
  const noSpacesProjDir = dirPath.replace(/^\s+/g, '');
  const cacheId = `resource-info-${noSpacesProjDir}`;

  let resourceInfo = nodeCache.get(cacheId);
  // return from cache if we have it
  if (resourceInfo) {
    return resourceInfo;
  }

  resourceInfo = await originGetGitInfo(dirPath);

  nodeCache.set(cacheId, resourceInfo, cacheTimeoutSeconds);
  return resourceInfo;
}

export interface ProjectInfo extends ProjectResource {
  name: string;
  directory: string;
}

export function getProjectFolder(fsPath: string): WorkspaceFolder | any {
  let liveShareFolder = null;
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    for (let i = 0; i < workspace.workspaceFolders.length; i++) {
      const workspaceFolder = workspace.workspaceFolders[i];
      const folderUri = workspaceFolder.uri;
      if (folderUri) {
        const isVslsScheme = folderUri.scheme === 'vsls';
        if (isVslsScheme) {
          liveShareFolder = workspaceFolder;
        } else if (fsPath?.includes(folderUri.fsPath)) {
          return workspaceFolder;
        }
      }
    }
  }

  // wasn't found but if liveShareFolder was found, return that
  if (liveShareFolder) {
    return liveShareFolder;
  }
  return null;
}

export class Project implements ProjectInfo {
  public name = '';

  public directory = '';

  public gitRepository = '';

  public gitBranch = '';

  public gitTag = '';

  constructor(values?: Partial<ProjectInfo>) {
    if (values) {
      Object.assign(this, values);
    }
  }

  static async createInstance(fsPath: string) {
    const workspaceFolder: WorkspaceFolder = getProjectFolder(fsPath);
    const directory = workspaceFolder ? workspaceFolder.uri.fsPath : UNTITLED;
    const workspaceFolderName = workspaceFolder ? workspaceFolder.name : NO_PROJ_NAME;
    const { branch, tag, repository } = await getGitInfo(directory);
    const project = new Project({
      name: workspaceFolderName,
      directory,
      gitBranch: branch,
      gitTag: tag,
      gitRepository: repository,
    });
    return project;
  }
}

interface ProjectData {
  sessionSeconds: number;
  editorSeconds: number;
  keystrokes: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface ProjectSummary extends ProjectInfo, ProjectData {}

export interface ProjectsSummary {
  [path: string]: ProjectSummary;
}

function getProjectsFile(day?: string) {
  return path.join(getStorageDayPath(day), 'projects.json');
}

async function getOriginProjectsSummary(day?: string) {
  const file = getProjectsFile(day);
  const fileIsExists = await fse.pathExists(file);
  return fileIsExists ? await fse.readJson(file) : {};
}

export async function getProjectsSummary(day?: string): Promise<ProjectsSummary> {
  try {
    return await getOriginProjectsSummary(day);
  } catch (e) {
    // logger.error('[projectStorage][getProjectsSummary] got error', e);
    return {};
  }
}

async function saveProjectsSummary(values: ProjectsSummary) {
  const file = getProjectsFile();
  await fse.writeJson(file, values, { spaces: jsonSpaces });
}

export async function updateProjectSummary(project: Project, increment: Partial<ProjectData>) {
  // always make sure projects summary is correct
  let projectsSummary;
  try {
    projectsSummary = await getOriginProjectsSummary();
  } catch (e) {
    // logger.error('[projectStorage][updateProjectSummary] getOriginProjectsSummary got error', e);
  }
  if (!projectsSummary) {
    return;
  }

  const { directory } = project;
  const {
    sessionSeconds = 0,
    editorSeconds = 0,
    keystrokes = 0,
    linesAdded = 0,
    linesRemoved = 0,
  } = increment;
  let projectSummary = projectsSummary[directory];
  if (!projectSummary) {
    projectSummary = {
      ...project,
      sessionSeconds,
      editorSeconds,
      keystrokes,
      linesAdded,
      linesRemoved,
    };
  } else {
    Object.assign(projectSummary, project);
    projectSummary.linesAdded += linesAdded;
    projectSummary.linesRemoved += linesRemoved;
    projectSummary.keystrokes += keystrokes;
    projectSummary.sessionSeconds += sessionSeconds;
    projectSummary.editorSeconds += editorSeconds;
    projectSummary.editorSeconds = Math.max(
      projectSummary.editorSeconds,
      projectSummary.sessionSeconds,
    );
  }
  projectsSummary[directory] = projectSummary;
  await saveProjectsSummary(projectsSummary);
}
