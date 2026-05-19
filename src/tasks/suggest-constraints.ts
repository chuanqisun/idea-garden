import OpenAI from "openai";
import { Observable, filter, from, map, switchMap } from "rxjs";
import { openaiApiKey$ } from "../openai/openai-connection";
import type { Constraint, IdeaItem } from "../types";
import { toLines } from "../utils/to-lines";

export function suggestConstraints(items: IdeaItem[]): Observable<Constraint> {
  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openaiApiKey$.value,
  });

  let id = 0;

  return from(
    openai.responses.create({
      stream: true,
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: `
Suggest constraints that help a user narrow down a list of ideas.
Each constraint should represent a dimension or facet such as audience, scope, format, cost, or timeframe.
Respond in JSONL format, exactly one item per line. Each item must be a valid JSON object in this shape:
{ "name": string, "options": string[] }
Rules:
- Keep "name" short and clear.
- Provide sensible options for each constraint.
- Base the constraints on the ideas provided by the user.
          `,
        },
        {
          role: "user",
          content: JSON.stringify(items.map(({ title, description }) => ({ title, description }))),
        },
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
}
