import OpenAI from "openai";
import { filter, from, map, Observable, tap, type BehaviorSubject } from "rxjs";
import { openaiApiKey$ } from "../openai/openai-connection";
import type { Constraint, IdeaItem } from "../store";
import { toLines } from "../utils/to-lines";

export function generateIdeas(
  ideas$: BehaviorSubject<IdeaItem[]>,
  constraints$: BehaviorSubject<Constraint[]>
): (title: string) => Promise<Observable<IdeaItem>> {
  return async (title: string) => {
    const openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: openaiApiKey$.value,
    });

    const selectedIdeas = ideas$.value
      .filter((idea) => idea.favorited)
      .map((idea) => ({ title: idea.title, description: idea.description }));
    const selectedConstraints = constraints$.value
      .filter((constraint) => constraint.favorited)
      .map((constraint) => ({
        name: constraint.name,
        selectedOptions: constraint.options.filter((option) => option.selected).map((option) => option.value),
      }))
      .filter((constraint) => constraint.selectedOptions.length > 0);

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
${selectedConstraints
  .map((constraint) => `- ${constraint.name} should be one of: ${constraint.selectedOptions.join(", ")}`)
  .join("\n")}.`.trim()
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

    const item$ = from(stream).pipe(
      filter((chunk) => chunk.type === "response.output_text.delta"),
      map((chunk) => chunk.delta),
      toLines(),
      filter((line) => line.trim().length > 0),
      map(toIdeaItem()),
      filter((item) => item !== null),
      tap((item) => ideas$.next([...ideas$.value, item!]))
    );

    return item$;
  };
}

function toIdeaItem(): (rawCode: string) => IdeaItem | null {
  let id = 0;

  return (rawCode: string) => {
    try {
      const parsed = JSON.parse(rawCode);
      return {
        id: id++,
        title: parsed.title,
        description: parsed.description,
      };
    } catch (e) {
      console.error("Failed to parse idea item", e);
      return null;
    }
  };
}
