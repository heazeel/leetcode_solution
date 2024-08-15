import spinner from "../../helpers/spinner";
import { getInnermostErrorMessage } from "../../utils";
import message from "./options/message";
import sync from "./options/sync";

const action = async (cmdArgs: any) => {
  try {
    await message.action(cmdArgs);
    // await codereview.action(cmdArgs);
    await sync.action(cmdArgs);

    process.exit(0);
  } catch (err) {
    const msg = getInnermostErrorMessage(err);
    spinner.fail(`${msg}`);
    setTimeout(() => {
      process.exit(1);
    }, 500);
  }
};

export default {
  command: "commit",
  description: "process the commit information using Crow.",
  optionList: [...message.options, ...sync.options],
  action,
};
