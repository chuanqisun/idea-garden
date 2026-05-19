import OpenAI from "openai";
import type { BehaviorSubject } from "rxjs";
import { Observable, filter, from, map, switchMap } from "rxjs";
import { openaiApiKey$ } from "../openai/openai-connection";
import type { Constraint, IdeaItem } from "../store";
import { toLines } from "../utils/to-lines";

export function suggestConstraints(
  constraints$: BehaviorSubject<Constraint[]>
): (items: IdeaItem[]) => Observable<Constraint> {
  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openaiApiKey$.value,
  });

  let id = 0;

  return (items: IdeaItem[]) => {
    const selectedConstraints = constraints$.value
      .filter((constraint) => constraint.favorited)
      .map((constraint) => ({ name: constraint.name, options: constraint.options }));

    return from(
      openai.responses.create({
        stream: true,
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content: `
Suggest 3-5 constraints that help a user narrow down a list of ideas.
Each constraint should represent a dimension or facet such as audience, scope, format, cost, or timeframe.
Respond in JSONL format, exactly one item per line. Each item must be a valid JSON object in this shape:
{ "name": string, "options": string[] }
Rules:
- Keep "name" short and clear.
- Provide sensible options for each constraint.
- Base the constraints on the ideas provided by the user.
            `.trim(),
          },
          {
            role: "user",
            content: `
Ideas:
${items.map((idea) => `- ${idea.title}: ${idea.description}`).join("\n")}
            `.trim(),
          },
          ...(selectedConstraints.length
            ? [
                {
                  role: "assistant" as const,
                  content: selectedConstraints.map((constraint) => JSON.stringify(constraint)).join("\n"),
                },
                {
                  role: "user" as const,
                  content: "Continue, generate 3-5 more",
                },
              ]
            : []),
        ],
        text: { verbosity: "low" },
        reasoning: { effort: "none" },
      })
    ).pipe(
      switchMap((stream) =>
        from(stream).pipe(
          filter((chunk) => chunk.type === "response.output_text.delta"),
          map((chunk) => chunk.delta),
          toLines(),
          filter((line) => line.trim().length > 0),
          map((rawCode) => {
            try {
              const parsed = JSON.parse(rawCode);
              return {
                id: id++,
                name: parsed.name,
                value: parsed.options?.at(0),
                options: parsed.options,
              } satisfies Constraint;
            } catch (error) {
              console.error("Failed to parse constraint", error);
              return null;
            }
          }),
          filter((constraint) => constraint !== null)
        )
      )
    );
  };
}
