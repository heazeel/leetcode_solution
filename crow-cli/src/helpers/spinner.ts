import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class Spinner {
  private spinner: Ora;

  constructor() {
    this.spinner = ora({
      spinner: {
        frames: ['—', '\\', '|', '/'],
        interval: 120,
      },
    });
  }
  // 开始加载
  public start = (text?: string) => {
    this.spinner.start(text);
  };

  // 加载成功
  public succeed = (text?: string, symbol?: string) => {
    if (symbol) {
      this.spinner.stopAndPersist({ symbol, text });
      return;
    }

    this.spinner.succeed(text);
  };

  public stopAndPersist = (text: string, symbol?: string) => {
    this.spinner.stopAndPersist({ symbol: symbol || '', text });
  };

  // 加载失败
  public fail = (text?: string) => {
    this.spinner.fail(chalk.red(text));
  };
}

const spinner = new Spinner();
export default spinner;
