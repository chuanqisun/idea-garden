import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import { openaiApiKey$ } from "../openai/openai-connection";

export function generateIdeas(): (title: string) => Promise<Stream<OpenAI.Responses.ResponseStreamEvent>> {
  return async (title: string) => {
    const openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: openaiApiKey$.value,
    });

    const stream = await openai.responses.create({
      stream: true,
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
Generate list of ideas based on the provided title. 
Respond in JSONL format, exactly one item per line. Each item must be valid JSON object in this type:
{ "title": string, "description": string }
            `,
        },
        { role: "user", content: title },
      ],
      text: { verbosity: "low" },
      reasoning: { effort: "none" },
    });

    return stream;
  };
}
