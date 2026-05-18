import { BehaviorSubject, distinctUntilChanged, tap } from "rxjs";
import { get, set } from "../storage/idb-keyval";

export const openaiApiKey$ = new BehaviorSubject("");

// init api key
get("openai-api-key").then((key) => {
  openaiApiKey$.next(key ?? "");
  openaiApiKey$
    .pipe(
      distinctUntilChanged(),
      tap((key) => set("openai-api-key", key))
    )
    .subscribe();
});
