import fse from 'fs-extra';
import path from 'path';
import * as mkdirp from 'mkdirp';
import { storagePath as worksStoragePath } from '@appworks/storage';
import { getNowDay } from './day';
import orderBy from 'lodash.orderby';

export const DEFAULT_TIME_STORAGE_LIMIT = 7;

const EXTENSION_TAG = 'CrowTimeMaster';

export function getStoragePath() {
  const storagePath = path.join(worksStoragePath, EXTENSION_TAG);
  if (!fse.existsSync(storagePath)) {
    mkdirp.sync(storagePath);
  }
  return storagePath;
}

export async function getStorageDaysDirs() {
  const storageDaysPath = getStorageDaysPath();
  const fileNames = await fse.readdir(storageDaysPath);
  const dayDirPaths = orderBy(
    (
      await Promise.all(
        fileNames.map(async (fileName) => {
          const filePath = path.join(storageDaysPath, fileName);
          const fileIsExists = await fse.pathExists(filePath);

          // TODO more rigorous
          if (fileIsExists) {
            return (await fse.stat(filePath)).isDirectory() ? fileName : undefined;
          }
        }),
      )
    ).filter((isDirectory) => isDirectory),
  );
  return dayDirPaths;
}

export function getStorageDaysPath() {
  const storagePath = getStoragePath();
  const storageDaysPath = path.join(storagePath, 'days');
  if (!fse.existsSync(storageDaysPath)) {
    mkdirp.sync(storageDaysPath);
  }
  return storageDaysPath;
}

export function getStorageDayPath(day?: string) {
  const storageDaysPath = getStorageDaysPath();
  const storageDayPath = path.join(storageDaysPath, day || getNowDay());
  if (!fse.existsSync(storageDayPath)) {
    mkdirp.sync(storageDayPath);
  }
  return storageDayPath;
}

export async function checkStorageDaysIsLimited() {
  const timeStorageLimit = DEFAULT_TIME_STORAGE_LIMIT;
  const storageDaysDirs = await getStorageDaysDirs();
  const timeStorageLength = storageDaysDirs.length;
  const excess = timeStorageLength - timeStorageLimit;
  const isExcess = excess > 0;

  // over the limit, delete the earlier storage
  if (isExcess) {
    const storageDaysPath = getStorageDaysPath();
    await Promise.all(
      storageDaysDirs.splice(0, excess).map(async (dayDir: any) => {
        const dayPath = path.join(storageDaysPath, dayDir);
        if (await fse.pathExists(dayPath)) {
          await fse.remove(dayPath);
        }
      }),
    );
  }
}
