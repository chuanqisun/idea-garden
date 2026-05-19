import { constraints$, ideas$ } from "../store";

export function cleanupChecks() {
  ideas$.next(ideas$.value.filter((idea) => idea.favorited));
  constraints$.next(constraints$.value.filter((constraint) => constraint.favorited));
}
