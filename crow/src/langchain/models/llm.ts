import {
  BaseLLM,
  BaseLLMCallOptions,
  BaseLLMParams,
} from '@langchain/core/language_models/llms';
import type { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { LLMResult } from "@langchain/core/outputs";
import { GenerationChunk } from 'langchain/schema';

export interface CrowLLMCallOptions extends BaseLLMCallOptions {
  stream?: boolean;
}

export interface CrowLLMParams extends BaseLLMParams {
  n: number;
}

export default class CrowLLM extends BaseLLM<CrowLLMCallOptions> {
  n: number;

  constructor(fields: CrowLLMParams) {
    super(fields);
    this.n = fields.n;
  }

  _llmType(): string {
    return 'crow_tongyi_llm';
  }

  async _generate(
    prompts: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<LLMResult> {
    const outputs = prompts.map((input) => input.slice(0, this.n));
    // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
    // await subRunnable.invoke(params, runManager?.getChild());

    // One input could generate multiple outputs.
    const generations = outputs.map((output) => [
      {
        text: output,
        // Optional additional metadata for the generation
        generationInfo: { outputCount: 1 },
      },
    ]);
    const tokenUsage = {
      usedTokens: this.n,
    };
    return {
      generations,
      llmOutput: { tokenUsage },
    };
  }

  // async _call(
  //   prompt: string,
  //   options: this['ParsedCallOptions'],
  //   runManager?: CallbackManagerForLLMRun | undefined
  // ): Promise<string> {
  //   // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
  //   // await subRunnable.invoke(params, runManager?.getChild());
  //   return prompt.slice(0, this.n);
  // }

  // async *_streamResponseChunks(
  //   prompt: string,
  //   options: this['ParsedCallOptions'],
  //   runManager?: CallbackManagerForLLMRun
  // ): AsyncGenerator<GenerationChunk> {
  //   // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
  //   // await subRunnable.invoke(params, runManager?.getChild());
  //   for (const letter of prompt.slice(0, this.n)) {
  //     yield new GenerationChunk({
  //       text: letter,
  //     });
  //     // Trigger the appropriate callback
  //     await runManager?.handleLLMNewToken(letter);
  //   }
  // }
}
