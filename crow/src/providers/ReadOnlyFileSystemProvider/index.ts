import * as fs from 'fs';
import {
  FileSystemProvider,
  FileChangeType,
  Uri,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileSystemError,
  FileStat,
  FileType,
  Disposable,
} from 'vscode';

export default class ReadOnlyFileSystemProvider implements FileSystemProvider {
  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event;

  readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
    return fs.promises.readFile(uri.fsPath);
  }

  // if the file is read-only, then throw an error
  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void | Thenable<void> {
    throw FileSystemError.NoPermissions('This file is read-only');
  }

  delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {
    throw FileSystemError.NoPermissions('This file is read-only');
  }

  rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void | Thenable<void> {
    throw FileSystemError.NoPermissions('This file is read-only');
  }

  async stat(uri: Uri): Promise<FileStat> {
    const stats = await fs.promises.stat(uri.fsPath);

    return {
      type: stats.isFile()
        ? FileType.File
        : stats.isDirectory()
        ? FileType.Directory
        : FileType.Unknown,
      size: stats.size,
      ctime: stats.ctime.getTime(),
      mtime: stats.mtime.getTime(),
    };
  }

  // Do not need to Implement the following methods, because they are not used in this extension
  readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
    throw new Error('Method not implemented.');
  }

  createDirectory(uri: Uri): void | Thenable<void> {
    throw new Error('Method not implemented.');
  }

  // Implement watch method because files need to listen to fs write changes
  watch(uri: Uri, options: { recursive: boolean; excludes: string[] }): Disposable {
    const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, (event, filename) => {
      this._onDidChangeFile.fire([
        { type: event === 'change' ? FileChangeType.Changed : FileChangeType.Deleted, uri },
      ]);
    });

    return { dispose: () => watcher.close() };
  }
}
