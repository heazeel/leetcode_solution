import { updateFilesSummary as updateFilesSummaryByKeystrokeStats } from '../recorders/keystrokeStats/index';
import { KeystrokeStats } from '../recorders/keystrokeStats/keystrokeStats';
import { updateFilesSummary as updateFilesSummaryByUsageStats } from '../recorders/usageStats/index';
import { UsageStats } from '../recorders/usageStats/usageStats';
import { updateProjectSummary } from '../storages/project';
import { updateUserSummary } from '../storages/user';
import { checkMidnight } from './walkClock';
import { delay } from '../utils/common';
import { getIsProcessingData, setIsProcessingData } from './processing';

async function saveDataToDisk(data: KeystrokeStats | UsageStats) {
  const { project } = data;
  try {
    const increment =
      data instanceof KeystrokeStats
        ? await updateFilesSummaryByKeystrokeStats(data)
        : await updateFilesSummaryByUsageStats(data);

    await updateProjectSummary(project, increment);
    await updateUserSummary(increment);
  } catch (e) {
    console.log(e);
  }
}

export async function processData(data: KeystrokeStats | UsageStats, delayTimes?: any) {
  delayTimes = Number.isInteger(delayTimes) ? delayTimes : 0;

  const isProcessingData = getIsProcessingData();
  if (!isProcessingData) {
    setIsProcessingData(true);
    try {
      await checkMidnight();
      await Promise.all([saveDataToDisk(data)]);
    } finally {
      setIsProcessingData(false);
    }
  } else if (delayTimes < 10) {
    await delay(1000);
    await processData(data, delayTimes + 1);
  }
}
