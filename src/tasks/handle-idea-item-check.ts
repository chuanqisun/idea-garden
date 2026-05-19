import { ideas$, type IdeaItem } from "../store";

export function handleIdeaItemCheck(idea: IdeaItem, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  ideas$.next(ideas$.value.map((i) => (i.id === idea.id ? { ...i, favorited: checked } : i)));
}
