export type Move = { window: number; direction: 1 | -1; stage?: number };
export const goal = () => Array.from({ length: 16 }, (_, i) => i + 1);
export const original = [8, 3, 12, 16, 1, 9, 11, 2, 13, 15, 10, 7, 14, 5, 4, 6];
export const indices = (window: number) => {
  const i = Math.floor(window / 3) * 4 + (window % 3);
  return [i, i + 1, i + 5, i + 4];
};
export const solved = (b: number[]) => b.every((v, i) => v === i + 1);
export function validate(b: number[]) {
  if (
    b.length !== 16 ||
    new Set(b).size !== 16 ||
    b.some((v) => !Number.isInteger(v) || v < 1 || v > 16)
  )
    throw new Error("Use each number from 1 to 16 exactly once.");
}
export function rotate(b: number[], m: Move) {
  const out = b.slice(),
    cells = indices(m.window);
  cells.forEach((i, k) => (out[cells[(k + m.direction + 4) % 4]] = b[i]));
  return out;
}
export const inverse = (m: Move): Move => ({
  ...m,
  direction: m.direction === 1 ? -1 : 1,
});
export function scramble(n: number) {
  let b = goal(),
    last = -1;
  for (let i = 0; i < n; i++) {
    let w = Math.floor(Math.random() * 9);
    while (w === last) w = Math.floor(Math.random() * 9);
    b = rotate(b, { window: w, direction: Math.random() < 0.5 ? 1 : -1 });
    last = w;
  }
  return b;
}
export const label = (m: Move) =>
  `${String.fromCharCode(65 + Math.floor(m.window / 3))}${(m.window % 3) + 1} · ${m.direction === 1 ? "Clockwise" : "Anticlockwise"}`;
