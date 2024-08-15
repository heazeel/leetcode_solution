import { program } from "commander";
import logger from "./helpers/logger";
import chalk from "chalk";
import figlet, { fonts } from "figlet";
import fs from "fs-extra";
import { getPathList, getPkgInfo, getConfigFilePath } from "./utils/index";
import { DEFAULT_CONFIG } from "./const";
import { ReadableStream } from "web-streams-polyfill";
import { doPolyfill } from "./utils/polyfill";
import fetch from "cross-fetch";

class CrowProgram {
  constructor() {
    const majorVersion = parseInt(process.version.slice(1).split(".")[0], 10);
    if (majorVersion < 18) {
      globalThis.ReadableStream = ReadableStream;
      globalThis.fetch = fetch;
    }

    this.initConfigFile();
    doPolyfill();
  }

  private initConfigFile = () => {
    const configFilePath = getConfigFilePath();
    if (!fs.existsSync(configFilePath)) {
      fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG));
    }
  };

  public register = async () => {
    const commandsPath = await getPathList("./commands/*/index.*s");

    commandsPath.forEach((commandPath) => {
      const commandObj = require(`./${commandPath}`);
      const { command, description, optionList, action } = commandObj.default;
      const curp = program
        .command(command)
        .description(description)
        .action((args) => {
          if (!args || Object.keys(args).length == 0) {
            curp.help();
          } else {
            action(args);
          }
        });

      optionList & 6;
      optionList.map((option: [string]) => {
        curp.option(...option);
      });
    });

    const packageInfo = getPkgInfo();
    const { version } = packageInfo;
    program.version(version);

    program.on("--help", async function () {
      console.log(
        "\r\n\n" +
          figlet.textSync("crow", {
            font: "ANSI Shadow",
            width: 80,
            whitespaceBreak: true,
          })
      );
      console.log(
        `\nRun ${chalk.cyan("crow <command> --help")} for detailed usage of given command.`
      );
    });

    program.on("command:*", async ([cmd]) => {
      logger.error(`未知命令 ${chalk.yellow(cmd)}`);
      program.outputHelp();
      process.exit(1);
    });

    program.parseAsync(process.argv);
    if (!program.args.length) {
      program.outputHelp();
    }
  };
}

const crowProgram = new CrowProgram();
crowProgram.register();
