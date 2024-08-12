import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import { Document } from "@langchain/core/documents";
import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

export interface LoadersMapping {
  [extension: string]: (filePath: string) => BaseDocumentLoader;
}

export enum UnknownHandling {
  Ignore = "ignore",
  Warn = "warn",
  Error = "error",
}

class CustomDirectLoader extends BaseDocumentLoader {
  private directoryPath: string;
  private loaders: LoadersMapping;
  private recursive: boolean;
  private unknown: UnknownHandling;
  private excludes: string[];

  constructor(directoryPath: string, loaders: LoadersMapping, recursive?: boolean, unknown?: UnknownHandling, excludes?: string[]) {
    super();
    this.directoryPath = directoryPath;
    this.loaders = loaders;
    this.recursive = recursive ?? true;
    this.unknown = unknown ?? UnknownHandling.Ignore;
    this.excludes = excludes || ["node_modules"];
  }

  async load(): Promise<Document[]> {
    const files = await readdir(this.directoryPath, { withFileTypes: true });
    const documents = [];
    for (const file of files) {
        const fullPath = resolve(this.directoryPath, file.name);
        
        if (this.excludes.some((exclude) => file.isDirectory() &&fullPath.includes(exclude))) {
          continue;
        }
        
        if (file.isDirectory()) {
          if (this.recursive) {
            const loader = new CustomDirectLoader(fullPath, this.loaders, this.recursive, this.unknown, this.excludes);
            documents.push(...(await loader.load()));
          }
        }
        else {
          const loaderFactory = this.loaders[extname(file.name)];
          if (loaderFactory) {
            const loader = loaderFactory(fullPath);
            documents.push(...(await loader.load()));
          }
          else {
            switch (this.unknown) {
              case UnknownHandling.Ignore:
                break;
              case UnknownHandling.Warn:
                console.warn(`Unknown file type: ${file.name}`);
                break;
              case UnknownHandling.Error:
                throw new Error(`Unknown file type: ${file.name}`);
              default:
              throw new Error(`Unknown unknown handling: ${this.unknown}`);
            }
          }
        }
    }
    return documents;
  }
}

export default CustomDirectLoader;