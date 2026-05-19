import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { filter, from, fromEvent, map, switchMap, tap, toArray } from "rxjs";
import { constraints$, ideas$, type Constraint, type IdeaItem } from "./store";
import "./style.css";
import { generateIdeas } from "./tasks/generate-ideas";
import { suggestConstraints } from "./tasks/suggest-constraints";
import { observe } from "./utils/observe-directive";
import { toLines } from "./utils/to-lines";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const ideaList = document.querySelector("#idea-list") as HTMLElement;
const ideaTitle = document.querySelector("#idea-title") as HTMLElement;
const parametersForm = document.querySelector("#parameters") as HTMLFormElement;

fromEvent(generateButton, "click")
  .pipe(
    tap(() => {
      ideas$.next(ideas$.value.filter((idea) => idea.favorited));
      constraints$.next(constraints$.value.filter((constraint) => constraint.favorited));
    }),
    map(() => ideaTitle.textContent ?? "Random ideas"),
    switchMap(generateIdeas(ideas$, constraints$)),
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
        switchMap(suggestConstraints(constraints$)),
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
          <h3>
            <label>
              <input type="checkbox" ?checked=${idea.favorited} @change=${(event: Event) => handleCheck(idea, event)} />
              ${idea.title}
            </label>
          </h3>
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
          <label
            ><input
              type="checkbox"
              ?checked=${constraint.favorited}
              @change=${(event: Event) => handleConstraintCheck(constraint, event)}
            />
            ${constraint.name}</label
          >
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

function handleCheck(idea: IdeaItem, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  ideas$.next(ideas$.value.map((i) => (i.id === idea.id ? { ...i, favorited: checked } : i)));
}

function handleConstraintCheck(constraint: Constraint, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  constraints$.next(constraints$.value.map((c) => (c.id === constraint.id ? { ...c, favorited: checked } : c)));
}

render(html` ${observe(ideaListView$)} `, ideaList);
render(html` ${observe(constraintsView$)} `, parametersForm);
