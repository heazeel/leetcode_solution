import moment from 'moment';
import { ONE_MIN_SECONDS } from '../constants';

/**
 * @param num {number} The number to round
 * @param precision {number} The number of decimal places to preserve
 */
function roundUp(num: number, precision: number) {
  precision = Math.pow(10, precision);
  return Math.ceil(num * precision) / precision;
}

function getNowUTCMoment() {
  const utcMoment = moment.utc();
  return utcMoment;
}

export function getNowUTCSec() {
  const utc = getNowUTCMoment();
  const nowInSec = utc.unix();
  return nowInSec;
}

export function humanizeMinutes(min: number) {
  // @ts-ignore
  min = parseInt(min, 0) || 0;
  let str = '';
  if (min === 60) {
    str = `1 小时}`;
  } else if (min > 60) {
    // @ts-ignore
    const hrs = parseFloat(min) / 60;
    const roundedTime = roundUp(hrs, 1);
    str = `${roundedTime.toFixed(1)} 小时`;
  } else if (min === 1) {
    str = `1 分钟`;
  } else {
    // less than 60 seconds
    str = `${min.toFixed(0)} 分钟`;
  }
  return str;
}

export function seconds2minutes(value: number) {
  return value / ONE_MIN_SECONDS;
}
