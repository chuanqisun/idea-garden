import OpenAI from "openai";
import { filter, from, fromEvent, switchMap, tap } from "rxjs";
import { openaiApiKey$ } from "./openai/openai-connection";
import "./style.css";

const generateButton = document.querySelector(`[data-action="generate"]`) as HTMLButtonElement;
const ideaList = document.querySelector("#idea-list") as HTMLElement;

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
        input: [{ role: "user", content: "Say hello in a long poem" }],
        text: { verbosity: "low" },
        reasoning: { effort: "none" },
      });

      return stream;
    }),
    switchMap((stream) => from(stream)),
    filter((chunk) => chunk.type === "response.output_text.delta"),
    tap((ideaChunk) => {
      ideaList.textContent += `${ideaChunk.delta}`;
    })
  )
  .subscribe();
