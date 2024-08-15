import chalk from 'chalk';

// 日志打印类，可以加入日志级别
export class Logger {
  public warn(text: string) {
    console.log(chalk.yellow(`\n${text}\n`));
  }

  public info(text: string) {
    console.log(chalk.cyan(`\n${text}\n`));
  }

  public error(text: string) {
    console.log(chalk.red(`\n${text}\n`));
  }
}

const logger = new Logger();

export default logger;
