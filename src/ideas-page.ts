import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { fromEvent, map, switchMap, tap, toArray } from "rxjs";
import { constraints$, ideas$, type Constraint, type ConstraintOption, type IdeaItem } from "./store";
import "./style.css";
import { generateIdeas } from "./tasks/generate-ideas";
import { suggestConstraints } from "./tasks/suggest-constraints";
import { observe } from "./utils/observe-directive";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const cleanButton = document.querySelector(`[data-action="clean"]`) as HTMLButtonElement;
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
    switchMap((item$) =>
      item$.pipe(
        toArray(),
        switchMap(suggestConstraints(constraints$)),
        tap((constraint) => constraints$.next([...constraints$.value, constraint]))
      )
    )
  )
  .subscribe();

fromEvent(cleanButton, "click")
  .pipe(
    tap(() => {
      ideas$.next(ideas$.value.filter((idea) => idea.favorited));
      constraints$.next(constraints$.value.filter((constraint) => constraint.favorited));
    })
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
              <input
                type="checkbox"
                ?checked=${idea.favorited}
                @change=${(event: Event) => handleIdeaItemCheck(idea, event)}
              />
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
          <div class="constraint-options">
            ${repeat(
              constraint.options,
              (option) => option.value,
              (option) => html`<button
                type="button"
                aria-pressed=${option.selected ? "true" : "false"}
                @click=${() => handleConstraintOptionToggle(constraint, option)}
              >
                ${option.value}
              </button>`
            )}
          </div>
        </div> `
      )}`
  )
);

render(html` ${observe(ideaListView$)} `, ideaList);
render(html` ${observe(constraintsView$)} `, parametersForm);

function handleIdeaItemCheck(idea: IdeaItem, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  ideas$.next(ideas$.value.map((i) => (i.id === idea.id ? { ...i, favorited: checked } : i)));
}

function handleConstraintCheck(constraint: Constraint, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  constraints$.next(
    constraints$.value.map((currentConstraint) =>
      currentConstraint.id === constraint.id
        ? {
            ...currentConstraint,
            favorited: checked,
            options: currentConstraint.options.map((option) => ({
              ...option,
              selected: checked ? option.selected : false,
            })),
          }
        : currentConstraint
    )
  );
}

function handleConstraintOptionToggle(constraint: Constraint, option: ConstraintOption) {
  constraints$.next(
    constraints$.value.map((currentConstraint) =>
      currentConstraint.id === constraint.id
        ? {
            ...currentConstraint,
            options: currentConstraint.options.map((currentOption) =>
              currentOption.value === option.value
                ? { ...currentOption, selected: !currentOption.selected }
                : currentOption
            ),
          }
        : currentConstraint
    )
  );
}
