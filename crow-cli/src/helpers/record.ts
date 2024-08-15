import { getUserInfo } from '../utils';

const packageJson = require('../../package.json');

class Record {
  public static instance: Record;
  public trace: any;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new Record();
    }
    return this.instance;
  }

  public log = (logItem: any) => {
    console.log({
      p1: 'crow-cli',
      ...logItem,
    });
  };
}

const record = Record.getInstance();

export default record;
