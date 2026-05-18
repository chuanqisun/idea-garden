import OpenAI from "openai";
import { BehaviorSubject, filter, from, fromEvent, map, switchMap, tap } from "rxjs";
import { toLines } from "./library/to-lines";
import { openaiApiKey$ } from "./openai/openai-connection";
import "./style.css";
import type { IdeaItem } from "./types";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const ideaList = document.querySelector("#idea-list") as HTMLElement;
const ideaTitle = document.querySelector("#idea-title") as HTMLElement;

const ideas$ = new BehaviorSubject<IdeaItem[]>([]);

fromEvent(generateButton, "click")
  .pipe(
    switchMap(async () => {
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
          { role: "user", content: ideaTitle.textContent ?? "Random ideas" },
        ],
        text: { verbosity: "low" },
        reasoning: { effort: "none" },
      });

      return stream;
    }),
    map((stream) =>
      from(stream).pipe(
        filter((chunk) => chunk.type === "response.output_text.delta"),
        map((chunk) => chunk.delta)
      )
    ),
    switchMap(toLines()),
    filter((line) => line.trim().length > 0),
    map(toIdeaItem()),
    filter((item) => item !== null),
    tap((item) => ideas$.next([...ideas$.value, item]))
  )
  .subscribe();

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
