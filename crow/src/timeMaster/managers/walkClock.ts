import { setNowDay, checkIsNewDay } from '../utils/day';
import { checkStorageDaysIsLimited } from '../utils/storage';

async function checkIsLimited() {
  try {
    await Promise.all([checkStorageDaysIsLimited()]);
  } catch (e) {
    // logger.error('[walkClock][checkIsLimited] got error:', e);
  }
}

export async function checkMidnight() {
  const isNewDay = checkIsNewDay();
  if (isNewDay) {
    setNowDay();
    try {
      await checkIsLimited();
    } catch (e) {
      // logger.error('[walkClock][checkMidnight] got error:', e);
    }
  }
}
