import test from "node:test";
import assert from "node:assert/strict";
import {
  goal,
  rotate,
  inverse,
  solved,
  validate,
  original,
} from "../src/puzzle/model.ts";
import { solve, eraseLoops, heuristic } from "../src/puzzle/solver.ts";
import { originalSolve } from "../src/puzzle/legacy.js";
import { fieldRotate, waveMoves } from "../src/puzzle/field.ts";
let seed = 20231030;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function permutation() {
  const b = goal();
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
// Independent grid rotation, not a call to the application's rotate helper.
function replay(b, moves) {
  b = b.slice();
  for (const m of moves) {
    const r = Math.floor(m.window / 3),
      c = m.window % 3,
      p = r * 4 + c;
    const [tl, tr, bl, br] = [b[p], b[p + 1], b[p + 4], b[p + 5]];
    [b[p], b[p + 1], b[p + 4], b[p + 5]] =
      m.direction === 1 ? [bl, tl, br, tr] : [tr, br, tl, bl];
  }
  return b;
}
test("all nine windows rotate clockwise correctly, reverse, and cycle", () => {
  for (let w = 0; w < 9; w++) {
    const m = { window: w, direction: 1 },
      b = goal(),
      next = rotate(b, m);
    assert.deepEqual(next, replay(b, [m]));
    assert.deepEqual(rotate(next, inverse(m)), b);
    assert.deepEqual([m, m, m, m].reduce(rotate, b), b);
    assert.deepEqual(b, goal());
  }
});
test("original example and all 24 final-square permutations", () => {
  const b = original.slice();
  assert.deepEqual(replay(b, solve(b).moves), goal());
  function permute(a) {
    if (!a.length) return [[]];
    return a.flatMap((x, i) =>
      permute(a.filter((_, j) => j !== i)).map((rest) => [x, ...rest]),
    );
  }
  for (const values of permute([11, 12, 15, 16])) {
    const b = goal();
    [10, 11, 14, 15].forEach((p, i) => (b[p] = values[i]));
    assert.deepEqual(replay(b, solve(b).moves), goal());
  }
});
test("10,000 seeded arbitrary permutations solve and refined routes never lengthen", () => {
  let max = 0,
    saved = 0;
  for (let i = 0; i < 10000; i++) {
    const b = permutation(),
      copy = b.slice(),
      raw = originalSolve(b),
      refined = solve(b);
    assert.deepEqual(b, copy);
    assert.deepEqual(replay(b, raw.moves), goal());
    assert.deepEqual(replay(b, refined.moves), goal());
    assert.ok(refined.moves.length <= raw.moves.length);
    max = Math.max(max, refined.moves.length);
    saved += raw.moves.length - refined.moves.length;
  }
  console.log(
    `10,000 permutations: longest refined route ${max}, removed ${saved} total turns.`,
  );
});
test("bounded IDA* agrees with exact BFS depths through two turns", () => {
  const seen = new Map([[goal().join(","), { b: goal(), depth: 0 }]]);
  let frontier = [goal()];
  for (let depth = 1; depth <= 2; depth++) {
    const next = [];
    for (const b of frontier)
      for (let w = 0; w < 9; w++)
        for (const d of [1, -1]) {
          const n = rotate(b, { window: w, direction: d });
          if (!seen.has(n.join(","))) {
            seen.set(n.join(","), { b: n, depth });
            next.push(n);
          }
        }
    frontier = next;
  }
  for (const { b, depth } of seen.values()) {
    assert.ok(heuristic(b) <= depth);
    const result = solve(b, "search");
    assert.ok(result.optimal);
    assert.equal(result.moves.length, depth);
    assert.ok(solved(replay(b, result.moves)));
  }
});
test("loop erasure keeps route endpoint", () => {
  const moves = [
    { window: 2, direction: 1 },
    { window: 2, direction: -1 },
    { window: 4, direction: 1 },
  ];
  assert.deepEqual(eraseLoops(goal(), moves), [moves[2]]);
});
test("validation rejects duplicates, missing numbers, fractions, out-of-range entries", () => {
  validate(goal());
  for (const b of [
    [],
    Array(16).fill(1),
    [...goal().slice(0, 15), 17],
    [...goal().slice(0, 15), 15.5],
  ])
    assert.throws(() => validate(b));
});
test("God mode waves are legal, scrambled, and exactly reversible across screen shapes", () => {
  for (const [rows, cols] of [
    [4, 4],
    [9, 16],
    [10, 5],
    [16, 24],
  ]) {
    const start = Array.from({ length: rows * cols }, (_, i) => i + 1),
      moves = waveMoves(rows, cols).flat();
    const b = moves.reduce((b, m) => fieldRotate(b, cols, m), start);
    assert.notDeepEqual(b, start);
    assert.equal(new Set(b).size, start.length);
    const end = moves
      .slice()
      .reverse()
      .reduce(
        (b, m) => fieldRotate(b, cols, { ...m, direction: -m.direction }),
        b,
      );
    assert.deepEqual(end, start);
  }
});
