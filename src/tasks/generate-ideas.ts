import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { BehaviorSubject } from "rxjs";
import { openaiApiKey$ } from "../openai/openai-connection";
import type { Constraint, IdeaItem } from "../store";

export function generateIdeas(
  ideas$: BehaviorSubject<IdeaItem[]>,
  constraints$: BehaviorSubject<Constraint[]>
): (title: string) => Promise<Stream<OpenAI.Responses.ResponseStreamEvent>> {
  return async (title: string) => {
    const openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: openaiApiKey$.value,
    });

    const selectedIdeas = ideas$.value
      .filter((idea) => idea.favorited)
      .map((idea) => ({ title: idea.title, description: idea.description }));
    const selectedConstraints = constraints$.value.filter((constraint) => constraint.favorited);

    const stream = await openai.responses.create({
      stream: true,
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: [
            `Generate list of ideas based on the provided title.`,
            selectedConstraints.length
              ? `
Follow these constraints:
${selectedConstraints.map((c) => `- ${c.name} should be ${c.value}`).join("\n")}.`.trim()
              : null,
            `
Respond in JSONL format, exactly one item per line. Each item must be valid JSON object in this type:
{ "title": string, "description": string }`.trim(),
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { role: "user", content: title },
        ...(selectedIdeas.length
          ? [
              { role: "assistant" as const, content: selectedIdeas.map((idea) => JSON.stringify(idea)).join("\n") },
              {
                role: "user" as const,
                content: "Continue, generate 3-5 more",
              },
            ]
          : []),
      ],
      text: { verbosity: "low" },
      reasoning: { effort: "none" },
    });

    return stream;
  };
}
