import { LogKeyEvent } from './common';
import Package from '../../package.json';

interface ArmsOptions {
  pid: string;
  env: string;
  plugins: any[];
  uid: string;
  username: string;
}

const DEFAULT_OPTIONS: Partial<ArmsOptions> = {
  pid: 'crow',
  env: `v${Package.version}`,
  plugins: [],
  uid: window?.userInfo?.workId || window?.userInfo?.userId || 'chrome_test',
  username: window?.userInfo?.userNick || window?.userInfo?.username || 'chrome_test_name',
};

export default function initArms(options: Partial<ArmsOptions> = {}) {
  const startTime = Date.now();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  LogKeyEvent({
    id: 'initArms',
    eventType: 'SYS',
    success: true,
    time: Date.now() - startTime,
  });
}
