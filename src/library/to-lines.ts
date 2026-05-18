import { Observable } from "rxjs";

export function toLines(raw$: Observable<string>): Observable<string> {
  return new Observable((subscriber) => {
    let buffer = "";

    const subscription = raw$.subscribe({
      next(chunk) {
        buffer += chunk;

        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop() ?? "";

        for (const line of parts) {
          subscriber.next(line);
        }
      },
      error(error) {
        subscriber.error(error);
      },
      complete() {
        if (buffer.length > 0) {
          subscriber.next(buffer);
        }

        subscriber.complete();
      },
    });

    return () => subscription.unsubscribe();
  });
}
