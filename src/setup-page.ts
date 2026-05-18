import { fromEvent, tap } from "rxjs";
import { openaiApiKey$ } from "./openai/openai-connection";
import "./style.css";

const apiKeyInput = document.querySelector(`[name="apiKey"]`) as HTMLInputElement;

// store to dom
openaiApiKey$.pipe(tap((key) => (apiKeyInput.value = key))).subscribe();

// dom to store
fromEvent(apiKeyInput, "input")
  .pipe(tap((event) => openaiApiKey$.next((event.target as HTMLInputElement).value)))
  .subscribe();
