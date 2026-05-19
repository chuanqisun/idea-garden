import { html, render } from "lit-html";
import { live } from "lit-html/directives/live.js";
import { repeat } from "lit-html/directives/repeat.js";
import { fromEvent, map, switchMap, tap, toArray } from "rxjs";
import { constraints$, ideas$, type Constraint, type ConstraintOption, type IdeaItem } from "./store";
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
const addConstraintButton = document.querySelector("#add-constraint") as HTMLButtonElement;
const addIdeaButton = document.querySelector("#add-idea") as HTMLButtonElement;

// ── Generate / Clean ────────────────────────────────────────────────────────

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

// ── Constraint operations ───────────────────────────────────────────────────

let _nextId = Date.now();
function nextId() {
  return ++_nextId;
}

function addConstraint() {
  constraints$.next([...constraints$.value, { id: nextId(), name: "New Constraint", options: [], favorited: false }]);
}

function updateConstraintName(constraint: Constraint, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  constraints$.next(constraints$.value.map((c) => (c.id === constraint.id ? { ...c, name: trimmed } : c)));
}

function deleteConstraint(constraint: Constraint) {
  constraints$.next(constraints$.value.filter((c) => c.id !== constraint.id));
}

function addConstraintOption(constraint: Constraint, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (constraint.options.some((o) => o.value === trimmed)) return;
  constraints$.next(
    constraints$.value.map((c) =>
      c.id === constraint.id ? { ...c, options: [...c.options, { value: trimmed, selected: false }] } : c
    )
  );
}

function deleteConstraintOption(constraint: Constraint, option: ConstraintOption) {
  constraints$.next(
    constraints$.value.map((c) =>
      c.id === constraint.id ? { ...c, options: c.options.filter((o) => o.value !== option.value) } : c
    )
  );
}

// ── Idea operations ─────────────────────────────────────────────────────────

function addIdeaItem() {
  ideas$.next([...ideas$.value, { id: nextId(), title: "New idea", description: "", favorited: false }]);
}

function updateIdeaTitle(idea: IdeaItem, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  ideas$.next(ideas$.value.map((i) => (i.id === idea.id ? { ...i, title: trimmed } : i)));
}

function updateIdeaDescription(idea: IdeaItem, description: string) {
  ideas$.next(ideas$.value.map((i) => (i.id === idea.id ? { ...i, description } : i)));
}

function deleteIdeaItem(idea: IdeaItem) {
  ideas$.next(ideas$.value.filter((i) => i.id !== idea.id));
}

// ── Add buttons ─────────────────────────────────────────────────────────────

fromEvent(addConstraintButton, "click").subscribe(addConstraint);
fromEvent(addIdeaButton, "click").subscribe(addIdeaItem);

// ── Views ────────────────────────────────────────────────────────────────────

const ideaListView$ = ideas$.pipe(
  map(
    (ideas) =>
      html`${repeat(
        ideas,
        (idea) => idea.id,
        (idea) => html`<li class="idea-item ${idea.favorited ? "favorited" : ""}">
          <div class="idea-header">
            <input
              type="checkbox"
              .checked=${Boolean(idea.favorited)}
              @change=${(event: Event) => handleIdeaItemCheck(idea, event)}
            />
            <input
              type="text"
              class="idea-title-input"
              .value=${live(idea.title)}
              @blur=${(e: FocusEvent) => updateIdeaTitle(idea, (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
            <button type="button" class="delete-btn" @click=${() => deleteIdeaItem(idea)}>×</button>
          </div>
          <textarea
            class="idea-desc-textarea"
            .value=${live(idea.description)}
            placeholder="Add description…"
            @blur=${(e: FocusEvent) => updateIdeaDescription(idea, (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </li>`
      )}`
  )
);

const constraintsView$ = constraints$.pipe(
  map(
    (constraints) =>
      html`${repeat(
        constraints,
        (constraint) => constraint.id,
        (constraint) => html`<div class="constraint">
          <div class="constraint-header">
            <label>
              <input
                type="checkbox"
                .checked=${Boolean(constraint.favorited)}
                @change=${(event: Event) => handleConstraintCheck(constraint, event)}
              />
            </label>
            <input
              type="text"
              class="constraint-name-input"
              .value=${live(constraint.name)}
              @blur=${(e: FocusEvent) =>
                updateConstraintName(constraint, (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
            <button
              type="button"
              class="delete-btn"
              @click=${() => deleteConstraint(constraint)}
            >×</button>
          </div>
          <div class="constraint-options">
            ${repeat(
              constraint.options,
              (option) => option.value,
              (option) => html`<span class="option-chip">
                <button
                  type="button"
                  class="option-toggle"
                  aria-pressed=${option.selected ? "true" : "false"}
                  @click=${() => handleConstraintOptionToggle(constraint, option)}
                >
                  ${option.value}
                </button>
                <button
                  type="button"
                  class="option-delete"
                  @click=${() => deleteConstraintOption(constraint, option)}
                >×</button>
              </span>`
            )}
            <input
              type="text"
              class="add-option-input"
              placeholder="+ option"
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  const input = e.target as HTMLInputElement;
                  addConstraintOption(constraint, input.value);
                  input.value = "";
                }
              }}
            />
          </div>
        </div>`
      )}`
  )
);

render(html`${observe(ideaListView$)}`, ideaList);
render(html`${observe(constraintsView$)}`, parametersForm);

