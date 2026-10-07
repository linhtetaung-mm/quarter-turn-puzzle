import { originalSolve } from "./legacy.js";
import { rotate, solved, validate, type Move } from "./model";
export type Solution = {
  moves: Move[];
  originalCount: number;
  elapsed: number;
  strategy: string;
  optimal: boolean;
};
// Removes loops in the returned path, without changing the constructive algorithm.
export function eraseLoops(start: number[], moves: Move[]): Move[] {
  const states = [start],
    result: Move[] = [];
  const seen = new Map([[start.join(","), 0]]);
  for (const m of moves) {
    const next = rotate(states.at(-1)!, m),
      key = next.join(","),
      previous = seen.get(key);
    if (previous !== undefined) {
      for (let i = states.length - 1; i > previous; i--)
        seen.delete(states[i].join(","));
      states.length = previous + 1;
      result.length = previous;
    } else {
      result.push(m);
      states.push(next);
      seen.set(key, result.length);
    }
  }
  return result;
}
export function solve(board: number[], strategy = "refined"): Solution {
  validate(board);
  const t = performance.now();
  const raw = originalSolve(board).moves as Move[];
  let moves = strategy === "original" ? raw : eraseLoops(board, raw);
  let optimal = solved(board);
  let description =
    strategy === "original"
      ? "Original constructive solver"
      : "Constructive solver + loop removal";
  if (strategy === "search") {
    const found = ida(board, Math.min(10, moves.length), t + 1800);
    if (found) {
      moves = found;
      optimal = true;
      description = "IDA* · shortest route";
    } else description = "Search limit reached · constructive fallback";
  }
  const final = moves.reduce(rotate, board);
  if (!solved(final))
    throw new Error("The solver returned a route that did not reach the goal.");
  return {
    moves,
    originalCount: raw.length,
    elapsed: performance.now() - t,
    strategy: description,
    optimal,
  };
}
export function heuristic(board: number[]) {
  let distance = 0,
    wrong = 0;
  board.forEach((v, i) => {
    const goal = v - 1;
    distance +=
      Math.abs(Math.floor(i / 4) - Math.floor(goal / 4)) +
      Math.abs((i % 4) - (goal % 4));
    if (v !== i + 1) wrong++;
  });
  return Math.max(Math.ceil(distance / 4), Math.ceil(wrong / 4));
}
function ida(
  board: number[],
  maxDepth: number,
  deadline: number,
): Move[] | null {
  const path: Move[] = [],
    keys = new Set([board.join(",")]);
  let nodes = 0;
  function visit(b: number[], g: number, bound: number, last?: Move): number {
    if (++nodes > 350000 || (nodes % 512 === 0 && performance.now() > deadline))
      throw new Error("budget");
    const f = g + heuristic(b);
    if (f > bound) return f;
    if (solved(b)) return -1;
    let min = Infinity;
    const candidates: { m: Move; b: number[]; h: number }[] = [];
    for (let window = 0; window < 9; window++)
      for (const direction of [1, -1] as const) {
        if (last && last.window === window && last.direction !== direction)
          continue;
        if (
          path.length > 1 &&
          last?.window === window &&
          path.at(-2)?.window === window
        )
          continue;
        const m = { window, direction, stage: 0 },
          n = rotate(b, m);
        if (!keys.has(n.join(",")))
          candidates.push({ m, b: n, h: heuristic(n) });
      }
    candidates.sort((a, b) => a.h - b.h);
    for (const { m, b: n } of candidates) {
      const key = n.join(",");
      keys.add(key);
      path.push(m);
      const result = visit(n, g + 1, bound, m);
      if (result === -1) return -1;
      path.pop();
      keys.delete(key);
      min = Math.min(min, result);
    }
    return min;
  }
  try {
    let bound = heuristic(board);
    while (bound <= maxDepth) {
      const next = visit(board, 0, bound);
      if (next === -1) return path.slice();
      if (!Number.isFinite(next)) break;
      bound = next;
    }
  } catch {
    return null;
  }
  return null;
}
