import path from 'path';
import fse from 'fs-extra';
import { getStoragePath } from '../utils/storage';
import { jsonSpaces } from '../config';

export class AverageSummary {
  dailySessionSeconds?: number = 0;

  dailyEditorSeconds?: number = 0;

  dailyKeystrokes?: number = 0;

  dailyLinesAdded?: number = 0;

  dailyLinesRemoved?: number = 0;
}

export function getAverageFile() {
  return path.join(getStoragePath(), 'average.json');
}

export async function getAverageSummary(): Promise<AverageSummary> {
  const file = getAverageFile();
  let averageSummary = new AverageSummary();
  try {
    averageSummary = await fse.readJson(file);
  } catch (e) {
    // ignore
  }
  return averageSummary;
}

export async function saveAverageSummary(averageSummary: AverageSummary) {
  const file = getAverageFile();
  await fse.writeJson(file, averageSummary, { spaces: jsonSpaces });
}

export async function clearAverageSummary() {
  const averageSummary = new AverageSummary();
  await saveAverageSummary(averageSummary);
}
