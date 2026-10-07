import { solve } from "./solver";
self.onmessage = (e: MessageEvent<{ board: number[]; strategy: string }>) => {
  try {
    self.postMessage({ result: solve(e.data.board, e.data.strategy) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Unable to solve this board.",
    });
  }
};
