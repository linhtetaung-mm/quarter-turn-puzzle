import { indices, type Move } from "./puzzle/model";
export type Motion = { from: number[]; move: Move; progress: number };
export default function Board({
  board,
  selected,
  onSelect,
  motion,
  locked,
  targets,
}: {
  board: number[];
  selected: number;
  onSelect: (n: number) => void;
  motion: Motion | null;
  locked: boolean;
  targets: boolean;
}) {
  const source = motion?.from ?? board,
    cells = indices(motion?.move.window ?? selected),
    active = indices(selected);
  return (
    <div className="board-frame">
      <div className="axis axis-top">
        {["01", "02", "03", "04"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <div className="axis axis-left">
        {["A", "B", "C", "D"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <div
        className="number-board"
        role="group"
        aria-label="4 by 4 rotation puzzle"
      >
        {source.map((v, i) => {
          let x = i % 4,
            y = Math.floor(i / 4);
          if (motion && cells.includes(i)) {
            const cx = (motion.move.window % 3) + 0.5,
              cy = Math.floor(motion.move.window / 3) + 0.5;
            const a = ((motion.progress * Math.PI) / 2) * motion.move.direction,
              dx = x - cx,
              dy = y - cy;
            x = cx + dx * Math.cos(a) - dy * Math.sin(a);
            y = cy + dx * Math.sin(a) + dy * Math.cos(a);
          }
          return (
            <button
              key={v}
              className={`tile ${active.includes(i) ? "inside" : ""} ${v === i + 1 ? "correct" : ""}`}
              disabled={locked}
              aria-label={`Number ${v}, row ${Math.floor(i / 4) + 1}, column ${(i % 4) + 1}. Select window here.`}
              style={{
                left: `${x * 25}%`,
                top: `${y * 25}%`,
                zIndex: motion && cells.includes(i) ? 3 : 1,
              }}
              onClick={() =>
                onSelect(
                  Math.min(Math.floor(i / 4), 2) * 3 + Math.min(i % 4, 2),
                )
              }
            >
              <span className="tile-number">{String(v).padStart(2, "0")}</span>
              {targets && (
                <small className="target-mark">
                  {String(i + 1).padStart(2, "0")}
                </small>
              )}
              <i className="correct-mark" />
            </button>
          );
        })}
        <div
          className={`rotation-window ${motion ? "turning" : ""}`}
          style={{
            left: `${(selected % 3) * 25}%`,
            top: `${Math.floor(selected / 3) * 25}%`,
          }}
        >
          <i />
          <i />
          <i />
          <i />
          <span className="window-cross">+</span>
        </div>
      </div>
      <div className="board-coordinate">
        4 × 4 FIELD{" "}
        <span>
          WINDOW {String.fromCharCode(65 + Math.floor(selected / 3))}
          {(selected % 3) + 1}
        </span>
      </div>
    </div>
  );
}
