export type FieldMove = { row: number; col: number; direction: 1 | -1 };
export function fieldRotate(board: number[], cols: number, m: FieldMove) {
  const rows = board.length / cols;
  if (m.row < 0 || m.col < 0 || m.row >= rows - 1 || m.col >= cols - 1)
    throw new Error("Window outside the field");
  const i = m.row * cols + m.col,
    cells = [i, i + 1, i + cols + 1, i + cols],
    next = board.slice();
  cells.forEach((p, k) => (next[cells[(k + m.direction + 4) % 4]] = board[p]));
  return next;
}
// Concentric waves of legal quarter turns, sorted radially with an angular tie-break.
export function waveMoves(rows: number, cols: number): FieldMove[][] {
  const rings = new Map<number, FieldMove[]>();
  const cr = (rows - 2) / 2,
    cc = (cols - 2) / 2;
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      const d = Math.floor(Math.hypot(r - cr, c - cc));
      const ring = rings.get(d) ?? [];
      ring.push({ row: r, col: c, direction: (r + c) % 2 ? 1 : -1 });
      rings.set(d, ring);
    }
  const sorted = [...rings.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, ring]) =>
      ring.sort(
        (a, b) =>
          Math.atan2(a.row - cr, a.col - cc) -
          Math.atan2(b.row - cr, b.col - cc),
      ),
    );
  return [
    ...sorted,
    ...sorted
      .slice()
      .reverse()
      .map((ring) => ring.map((m) => ({ ...m, direction: m.direction }))),
    ...sorted,
  ];
}
