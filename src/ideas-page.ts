import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import OpenAI from "openai";
import { BehaviorSubject, filter, from, fromEvent, map, Observable, switchMap, tap, toArray } from "rxjs";
import { openaiApiKey$ } from "./openai/openai-connection";
import "./style.css";
import type { Constraint, IdeaItem } from "./types";
import { observe } from "./utils/observe-directive";
import { toLines } from "./utils/to-lines";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const ideaList = document.querySelector("#idea-list") as HTMLElement;
const ideaTitle = document.querySelector("#idea-title") as HTMLElement;
const parametersForm = document.querySelector("#parameters") as HTMLFormElement;

const ideas$ = new BehaviorSubject<IdeaItem[]>([]);
const constraints$ = new BehaviorSubject<Constraint[]>([]);

fromEvent(generateButton, "click")
  .pipe(
    tap(() => {
      ideas$.next([]);
      constraints$.next([]);
    }),
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
    switchMap((stream) =>
      from(stream).pipe(
        filter((chunk) => chunk.type === "response.output_text.delta"),
        map((chunk) => chunk.delta),
        toLines(),
        filter((line) => line.trim().length > 0),
        map(toIdeaItem()),
        filter((item) => item !== null),
        tap((item) => ideas$.next([...ideas$.value, item])),
        toArray(),
        switchMap((items) => suggestConstraints(items)),
        tap((constraint) => constraints$.next([...constraints$.value, constraint]))
      )
    )
  )
  .subscribe();

const ideaListView$ = ideas$.pipe(
  map(
    (ideas) =>
      html` ${repeat(
        ideas,
        (idea) => idea.id,
        (idea) => html`<li>
          <h3>${idea.title}</h3>
          <p>${idea.description}</p>
        </li> `
      )}`
  )
);

const constraintsView$ = constraints$.pipe(
  map(
    (constraints) =>
      html` ${repeat(
        constraints,
        (constraint) => constraint.id,
        (constraint) => html`<div class="constraint">
          <label>${constraint.name}</label>
          <select name="${constraint.name}">
            ${constraint.options.map((option) => html`<option value="${option}">${option}</option>`)}
          </select>
        </div> `
      )}`
  )
);

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

function suggestConstraints(items: IdeaItem[]): Observable<Constraint> {
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

render(html` ${observe(ideaListView$)} `, ideaList);
render(html` ${observe(constraintsView$)} `, parametersForm);
