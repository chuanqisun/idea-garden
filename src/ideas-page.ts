import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { fromEvent, map, switchMap, tap, toArray } from "rxjs";
import { constraints$, ideas$ } from "./store";
import "./style.css";
import { generateIdeas } from "./tasks/generate-ideas";
import { cleanupChecks } from "./tasks/handle-clean-up-checks";
import { handleConstraintCheck, handleConstraintOptionToggle } from "./tasks/handle-constraint-check";
import { handleIdeaItemCheck } from "./tasks/handle-idea-item-check";
import { suggestConstraints } from "./tasks/suggest-constraints";
import { observe } from "./utils/observe-directive";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const cleanButton = document.querySelector(`[data-action="clean"]`) as HTMLButtonElement;
const ideaList = document.querySelector("#idea-list") as HTMLElement;
const ideaTitle = document.querySelector("#idea-title") as HTMLElement;
const parametersForm = document.querySelector("#parameters") as HTMLFormElement;

fromEvent(generateButton, "click")
  .pipe(
    tap(cleanupChecks),
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

fromEvent(cleanButton, "click").pipe(tap(cleanupChecks)).subscribe();

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
                .checked=${Boolean(idea.favorited)}
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
              .checked=${Boolean(constraint.favorited)}
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
