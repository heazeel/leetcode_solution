/**
 * Operation 枚举类型，用于表示文件操作的类型
 * @enum {string}
 */
export enum Operation {
  /**
   * 创建快照操作
   */
  CREATE_SNAPSHOT = 'createSnapshot',
  /**
   * 创建文件操作
   */
  CREATE_FILE = 'createFile',
  /**
   * 删除文件操作
   */
  DELETE_FILE = 'deleteFile',
  /**
   * 打开文件操作
   */
  OPEN_FILE = 'openFile',
  /**
   * 关闭文件操作
   */
  CLOSE_FILE = 'closeFile',
  /**
   * 保存文件操作
   */
  SAVE_FILE = 'saveFile',
  /**
   * 编辑文件操作
   */
  EDIT_FILE = 'editFile',
  /**
   * 激活文件操作
   */
  ACTIVE_FILE = 'activeFile',
  /**
   * 移动文件操作
   */
  MOVE_FILE = 'moveFile',
  /**
   * 添加评论操作
   */
  ADD_COMMENT = 'addComment',
  /**
   * 浏览器打开链接
   */
  OPEN_LINK = 'openLink',
}

/**
 * 定义日志项接口，包含时间戳、工作ID、操作类型和额外信息
 */
export interface LogItem {
  /**
   * 记录事件发生的时间戳，以毫秒为单位
   */
  timestamp: number;
  /**
   * 与该日志项相关的工作ID
   */
  workId: string;
  /**
   * 表示执行的操作，可以是枚举类型 Operation 的成员
   */
  action: Operation;
  /**
   * 包含额外信息的对象，如文件名和（在某些情况下）内容变更
   */
  extra: {
    /**
     * 当前被操作的文件名
     * 相对工作区的文件路径
     */
    filename: string;
    /**
     * 工作区路径
     */
    workspacePath: string;
    /**
     * 被操作后的文件名，例如 mv、重命名等操作
     * 相对工作区的文件路径
     */
    newFilename?: string;
    /**
     * 当 action 为 EDIT 时，此字段包含内容变更的详细信息
     * @type {any[]}
     */
    contentChanges?: any[];
    comment?: string;
    pageContent?: string;
    url?: string;
  };
}

export interface IRange {
  line: number;
  character: number;
}

export interface IContentChangeItem {
  range: IRange[];
  rangeOffset: number;
  rangeLength: number;
  text: string;
}
