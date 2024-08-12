import path from 'path';
import url from 'url';
import {
  TextDocument,
  TextDocumentChangeEvent,
  FileRenameEvent,
  FileDeleteEvent,
  FileCreateEvent,
  WindowState,
  window,
  TextDocumentContentChangeEvent,
  workspace,
  ExtensionContext,
} from 'vscode';
import { isFileActive } from '../../utils/common';
import { Project } from '../../storages/project';
import { cleanTextInfoCache } from '../../storages/file';
import { KeystrokeStats } from './keystrokeStats';
import { recordKeystrokeDurationMins } from '../../config';
import TimeMachine from '../../../timeMachine';
import { Operation as actionType } from '../../../timeMachine/types';

import { GlobalState } from '../../../utilities/state';
import { CROW_USER_INFO } from '../../../constants';

const keystrokeStatsMap: { [projectPath: string]: KeystrokeStats } = {};

const timeInstanceQueue: any = {};

export class KeystrokeStatsRecorder {
  private keystrokeStatsTimeouts: { [key: string]: NodeJS.Timeout } = {};
  private context: ExtensionContext | null = null;
  private userInfo: any;

  public async activate(context: ExtensionContext) {
    this.context = context;
    this.userInfo = this.context && GlobalState.get(this.context, CROW_USER_INFO).value;
    const activeEditor = window.activeTextEditor;
    // 初始化进来时判断是否有存在的文件，上报激活事件&快照下来
    if (activeEditor) {
      const { document } = activeEditor;
      const { fileName } = document || {};
      const workspacePath = this.getCurrentWorkspace();
      const filename = path.relative(workspacePath, fileName);
      const extra = {
        filename,
      };
      this.sendLog(actionType.ACTIVE_FILE, extra);
    }
    // move file&dir
    workspace.onDidRenameFiles(this.onDidRenameFiles, this);
    // delete file
    workspace.onDidDeleteFiles(this.onDidDeleteFiles, this);
    // create file
    workspace.onDidCreateFiles(this.onDidCreateFiles, this);
    // save file
    workspace.onDidSaveTextDocument(this.onDidSaveTextDocument, this);
    // active file
    window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this);

    // document listener handlers
    workspace.onDidOpenTextDocument(this.onDidOpenTextDocument, this);
    workspace.onDidCloseTextDocument(this.onDidCloseTextDocument, this);
    workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this);
    // window state changed handler
    window.onDidChangeWindowState(this.onDidChangeWindowState, this);
  }

  public async deactivate() {
    for (let key in timeInstanceQueue) {
      timeInstanceQueue[key]?.clear();
    }
    await this.processData();
  }

  /**
   * send logic:
   *
   * - Change Window State, not focused
   * - The time interval between keystrokes, control by "recordKeystrokeDurationMins"
   * - extension deactivate
   */
  private async processData() {
    for (const projectPath in keystrokeStatsMap) {
      if (Object.prototype.hasOwnProperty.call(keystrokeStatsMap, projectPath)) {
        // clear other sending instructions and prevent multiple sending
        if (this.keystrokeStatsTimeouts[projectPath]) {
          clearTimeout(this.keystrokeStatsTimeouts[projectPath]);
        }
        await this.processKeystrokeStats(projectPath);
      }
    }

    cleanTextInfoCache();
  }

  // 获取当前工作区
  private getCurrentWorkspace() {
    const currentWorkspace = workspace.workspaceFolders?.[0];
    const { uri } = currentWorkspace || {};
    const currentWorkspacePath = uri?.fsPath || '';
    return currentWorkspacePath;
  }

  // 是否在需要忽略的目录下
  private isUnderIgnoreDir(filePath: string) {
    const dirs = filePath.split(path.sep);
    for (let i = dirs.length - 1; i >= 0; i--) {
      if (
        dirs[i] === 'node_modules' ||
        (dirs[i] === 'webview-ui' && dirs[i - 1] === 'node_modules') ||
        dirs[i] === '.crow'
      ) {
        return true;
      }
    }
    return false;
  }

  // 过滤忽略的文件、目录
  private filter(filename: string) {
    // 不在workspace目录下
    if (filename.startsWith('..' + path.sep)) {
      return false;
    }
    // 是否是.lock等文件
    const basename = path.basename(filename);
    if (basename === 'package-lock.json' || basename === '.DS_Store') {
      return false;
    }
    // 是否是以.git结尾的文件
    if (filename.endsWith('.git')) {
      return false;
    }
    const workspacePath = this.getCurrentWorkspace();
    const rootPath = path.join(workspacePath, filename);
    return !this.isUnderIgnoreDir(rootPath);
  }

  // 发送行为埋点日志
  private sendLog(
    action: actionType,
    extra: { filename: string; newFilename?: string; contentChanges?: any[] },
  ) {
    const { filename } = extra;
    if (!this.filter(filename)) {
      return;
    }
    const currentWorkspacePath = this.getCurrentWorkspace();
    let timeMachine: TimeMachine;
    if (timeInstanceQueue[currentWorkspacePath]) {
      timeMachine = timeInstanceQueue[currentWorkspacePath];
    } else {
      timeMachine = new TimeMachine(currentWorkspacePath);
    }
    const timestamp = new Date().getTime();
    const logItem = {
      workId: this.userInfo.workId,
      action,
      timestamp,
      extra: {
        ...extra,
        workspacePath: currentWorkspacePath,
      },
    };
    try {
      const filename = extra.filename;
      timeInstanceQueue[filename] = timeMachine;
      timeMachine.log(logItem);
    } catch (err) {
      console.log(err);
    }
  }

  // moveFiles、moveDirs
  public onDidRenameFiles = (event: FileRenameEvent) => {
    const { files = [] } = event || {};
    const workspacePath = this.getCurrentWorkspace();
    files.forEach((file) => {
      const { newUri, oldUri } = file || {};
      const filename = path.relative(workspacePath, oldUri.path);
      const newFilename = path.relative(workspacePath, newUri.path);
      const extra = {
        filename,
        newFilename,
      };
      this.sendLog(actionType.MOVE_FILE, extra);
    });
  };

  // delete files
  public onDidDeleteFiles = (event: FileDeleteEvent) => {
    const { files = [] } = event || {};
    const workspacePath = this.getCurrentWorkspace();
    files.forEach((file) => {
      const filename = path.relative(workspacePath, file.path);
      const extra = {
        filename,
      };
      this.sendLog(actionType.DELETE_FILE, extra);
    });
  };

  // create files
  public onDidCreateFiles = (event: FileCreateEvent) => {
    const { files = [] } = event || {};
    const workspacePath = this.getCurrentWorkspace();
    files.forEach((file) => {
      const filename = path.relative(workspacePath, file.path);
      const extra = {
        filename,
      };
      this.sendLog(actionType.CREATE_FILE, extra);
    });
  };

  // save files
  public onDidSaveTextDocument = (textDocument: TextDocument) => {
    const workspacePath = this.getCurrentWorkspace();
    const filename = path.relative(workspacePath, textDocument.fileName);
    const extra = {
      filename,
    };
    this.sendLog(actionType.SAVE_FILE, extra);
  };

  public onDidChangeActiveTextEditor = (editor: any) => {
    if (editor) {
      const { document } = editor || {};
      const { fileName } = document || {};
      const workspacePath = this.getCurrentWorkspace();
      const filename = path.relative(workspacePath, fileName);
      const extra = {
        filename,
      };
      this.sendLog(actionType.ACTIVE_FILE, extra);
    }
  };

  public async onDidOpenTextDocument(textDocument: TextDocument) {
    const workspacePath = this.getCurrentWorkspace();
    const filename = path.relative(workspacePath, textDocument.fileName);
    const extra = {
      filename,
    };
    this.sendLog(actionType.OPEN_FILE, extra);
    if (!window.state.focused) {
      return;
    }

    const { fileName: fsPath } = textDocument;
    if (!this.isValidatedFile(textDocument, fsPath)) {
      return;
    }

    const keyStrokeStats = await this.createKeystrokeStats(fsPath);
    const currentFileChange = keyStrokeStats.files[fsPath];
    currentFileChange.updateTextInfo(textDocument);
    currentFileChange.open += 1;
  }

  public async onDidCloseTextDocument(textDocument: TextDocument) {
    const workspacePath = this.getCurrentWorkspace();
    const filename = path.relative(workspacePath, textDocument.fileName);
    const extra = {
      filename,
    };
    this.sendLog(actionType.CLOSE_FILE, extra);

    if (!window.state.focused) {
      return;
    }

    const { fileName: fsPath } = textDocument;
    if (!this.isValidatedFile(textDocument, fsPath, true)) {
      return;
    }

    const keyStrokeStats = await this.createKeystrokeStats(fsPath);
    const currentFileChange = keyStrokeStats.files[fsPath];
    currentFileChange.close += 1;
  }

  public async onDidChangeTextDocument(textDocumentChangeEvent: TextDocumentChangeEvent) {
    const fileName = textDocumentChangeEvent.document.fileName;
    const workspacePath = this.getCurrentWorkspace();
    const filename = path.relative(workspacePath, fileName);
    const changes: any = textDocumentChangeEvent.contentChanges;
    const extra = {
      filename,
      contentChanges: changes,
    };

    this.sendLog(actionType.EDIT_FILE, extra);

    const windowIsFocused = window.state.focused;
    // logger.debug(
    //   '[KeystrokeStatsRecorder][onDidChangeTextDocument][windowIsFocused]',
    //   windowIsFocused,
    // );

    if (!windowIsFocused) {
      return;
    }

    const { document } = textDocumentChangeEvent;
    const { fileName: fsPath } = document;

    const isValidatedFile = this.isValidatedFile(document, fsPath);
    // logger.debug(
    //   '[KeystrokeStatsRecorder][onDidChangeTextDocument][isValidatedFile]',
    //   isValidatedFile,
    // );
    if (!isValidatedFile) {
      return;
    }

    const keyStrokeStats = await this.createKeystrokeStats(fsPath);
    const currentFileChange = keyStrokeStats.files[fsPath];
    if (!currentFileChange.start) {
      currentFileChange.setStart();
    }
    currentFileChange.updateTextInfo(document);

    // find the contentChange with a range in the contentChanges array
    // THIS CAN HAVE MULTIPLE CONTENT_CHANGES WITH RANGES AT ONE TIME.
    // LOOP THROUGH AND REPEAT COUNTS
    const contentChanges = textDocumentChangeEvent.contentChanges.filter((change) => change.range);
    const contentChangesLength = contentChanges.length;
    // logger.debug(
    //   '[KeystrokeStatsRecorder][onDidChangeTextDocument]contentChanges',
    //   contentChangesLength,
    // );
    // each changeset is triggered by a single keystroke
    if (contentChangesLength > 0) {
      currentFileChange.keystrokes += 1;
    }

    for (const contentChange of contentChanges) {
      const textChangeInfo = this.getTextChangeInfo(contentChange);
      if (textChangeInfo.textChangeLen > 4) {
        // 4 is the threshold here due to typical tab size of 4 spaces
        currentFileChange.pasteTimes += 1;
      } else if (textChangeInfo.textChangeLen < 0) {
        currentFileChange.deleteTimes += 1;
      } else if (textChangeInfo.hasNonNewLine) {
        currentFileChange.addTimes += 1;
      }
      // increment keystrokes by 1
      keyStrokeStats.keystrokes += 1;

      if (textChangeInfo.linesDeleted) {
        currentFileChange.linesRemoved += textChangeInfo.linesDeleted;
      } else if (textChangeInfo.linesAdded) {
        currentFileChange.linesAdded += textChangeInfo.linesAdded;
      }
    }

    currentFileChange.setEnd();
  }

  public async onDidChangeWindowState(windowState: WindowState) {
    const { focused } = windowState || {};
    // logger.debug('[KeystrokeStatsRecorder][onDidChangeWindowState][focused]', focused);
    if (!focused) {
      await this.processData();
    }
  }

  /**
   * This will return true if it's a validated file.
   * we don't want to send events for .git or
   * other event triggers such as extension.js.map events
   */
  private isValidatedFile(textDocument: TextDocument, fsPath: string, isCloseEvent?: boolean) {
    if (!fsPath) {
      return false;
    }

    const { scheme } = textDocument.uri;

    // we'll get 'git' as a scheme, but these are the schemes that match to open files in the editor
    const isDocEventScheme =
      scheme === 'file' || scheme === 'untitled' || scheme === 'vscode-remote';
    const isLiveShareTmpFile = fsPath.match(/.*\.code-workspace.*vsliveshare.*tmp-.*/);
    const isInternalFile = fsPath.match(/.*\.appworks.*/);

    // return false that its not a doc that we want to track based on the
    // following conditions:
    // non-doc scheme, is liveShare tmp file, is internal file and the file is no longer active
    if (
      !isDocEventScheme ||
      isLiveShareTmpFile ||
      isInternalFile ||
      (!isFileActive(fsPath) && !isCloseEvent)
    ) {
      return false;
    }

    return true;
  }

  private getTextChangeInfo(contentChange: TextDocumentContentChangeEvent) {
    const { rangeLength, text, range } = contentChange;

    let textChangeLen = text?.length;
    const linesChanged = range.end.line - range.start.line;
    const newLineMatches = text?.match(/[\n\r]/g);

    let linesAdded = 0;
    let linesDeleted = 0;
    let isCharDelete = false;
    if (linesChanged) {
      // update removed lines
      linesDeleted = linesChanged;
    } else if (newLineMatches && textChangeLen) {
      // this means there are new lines added
      linesAdded = newLineMatches.length;
    } else if (rangeLength && !text) {
      // this may be a character delete
      isCharDelete = true;
    }

    // check if its a character deletion
    if (!textChangeLen && rangeLength) {
      // NO content text but has a range change length, set the textChangeLen
      // to the inverse of the rangeLength to show the chars deleted
      textChangeLen = rangeLength / -1;
    }

    let hasNonNewLine = false;
    if (textChangeLen && !linesAdded && !linesDeleted) {
      // flag to state we have chars deleted but no new lines
      hasNonNewLine = true;
    }

    let hasChanges = false;
    if (linesAdded || linesDeleted || textChangeLen || isCharDelete) {
      // there are changes
      hasChanges = true;
    }

    return {
      linesAdded,
      linesDeleted,
      textChangeLen,
      isCharDelete,
      hasNonNewLine,
      hasChanges,
    };
  }

  private async processKeystrokeStats(projectPath: string) {
    const keystrokeStats = keystrokeStatsMap[projectPath];
    if (keystrokeStats) {
      await keystrokeStats.processData();
      delete keystrokeStatsMap[projectPath];
    }
  }

  private async createKeystrokeStats(fsPath: string): Promise<KeystrokeStats> {
    const project = await Project.createInstance(fsPath);
    const { directory: projectPath } = project;
    let keystrokeStats = keystrokeStatsMap[projectPath];
    if (!keystrokeStats) {
      keystrokeStats = new KeystrokeStats(project);
      keystrokeStats.activate();
      this.keystrokeStatsTimeouts[projectPath] = setTimeout(() => {
        // logger.debug('[KeystrokeStatsRecorder][createKeystrokeStats][keystrokeStatsTimeouts] run');
        this.processKeystrokeStats(projectPath).catch(() => {
          /* ignore error */
        });
      }, recordKeystrokeDurationMins);
    }

    if (!keystrokeStats.hasFile(fsPath)) {
      keystrokeStats.addFile(fsPath);
    }

    keystrokeStatsMap[projectPath] = keystrokeStats;
    return keystrokeStats;
  }
}

let keystrokeStatsRecorder: KeystrokeStatsRecorder;
export function getInterface() {
  if (!keystrokeStatsRecorder) {
    keystrokeStatsRecorder = new KeystrokeStatsRecorder();
  }
  return keystrokeStatsRecorder;
}
