import path from 'path';
import fse from 'fs-extra';
import { getStorageDayPath } from '../utils/storage';
import { jsonSpaces } from '../config';

export class UserSummary {
  /**
   * Active code time
   */
  sessionSeconds = 0;

  /**
   * Editor usage time
   */
  editorSeconds = 0;

  keystrokes = 0;

  linesAdded = 0;

  linesRemoved = 0;
}

function getUserFile(day?: string) {
  return path.join(getStorageDayPath(day), 'user.json');
}

async function getOriginUserSummary(day?: string) {
  const file = getUserFile(day);
  const fileIsExists = await fse.pathExists(file);
  return fileIsExists ? await fse.readJson(file) : new UserSummary();
}

export async function getUserSummary(day?: string): Promise<UserSummary> {
  try {
    return await getOriginUserSummary(day);
  } catch (e) {
    // logger.error('[userStorage][getUserSummary] got error', e);
    return new UserSummary();
  }
}

async function saveUserSummary(userSummary: UserSummary) {
  const file = getUserFile();
  await fse.writeJson(file, userSummary, { spaces: jsonSpaces });
}

export async function updateUserSummary(increment: Partial<UserSummary>) {
  const {
    linesAdded = 0,
    linesRemoved = 0,
    keystrokes = 0,
    sessionSeconds = 0,
    editorSeconds = 0,
  } = increment;
  // always make sure user summary is correct
  let userSummary;
  try {
    userSummary = await getOriginUserSummary();
  } catch (e) {
    // logger.error('[userStorage][updateUserSummary] getOriginUserSummary got error', e);
  }
  if (!userSummary) {
    return;
  }

  userSummary.sessionSeconds += sessionSeconds;
  userSummary.editorSeconds += editorSeconds;
  userSummary.editorSeconds = Math.max(userSummary.editorSeconds, userSummary.sessionSeconds);
  userSummary.linesAdded += linesAdded;
  userSummary.linesRemoved += linesRemoved;
  userSummary.keystrokes += keystrokes;
  await saveUserSummary(userSummary);
}
