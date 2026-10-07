import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Maximize,
  Undo2,
  RefreshCw,
} from "lucide-react";
import { fieldRotate, waveMoves, type FieldMove } from "./puzzle/field";
export default function GodMode({ onExit }: { onExit: () => void }) {
  const [size] = useState(() => ({
    cols: Math.max(4, Math.min(24, Math.ceil(window.innerWidth / 88))),
    rows: Math.max(4, Math.min(16, Math.ceil(window.innerHeight / 88))),
  }));
  const { rows, cols } = size;
  const ordered = () => Array.from({ length: rows * cols }, (_, i) => i + 1);
  const [board, setBoard] = useState(ordered),
    [selected, setSelected] = useState({
      row: Math.floor((rows - 2) / 2),
      col: Math.floor((cols - 2) / 2),
    });
  const [state, setState] = useState<"ready" | "wave" | "play">("ready"),
    [history, setHistory] = useState<FieldMove[]>([]),
    [lit, setLit] = useState<number[]>([]),
    [moves, setMoves] = useState(0),
    [help, setHelp] = useState(false);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const alive = useRef(true),
    generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    root = useRef<HTMLDivElement>(null);
  const isSolved = board.every((v, i) => v === i + 1),
    cellW = viewport.width / cols,
    cellH = viewport.height / rows;
  useEffect(() => {
    alive.current = true;
    const resize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => {
      alive.current = false;
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("resize", resize);
    };
  }, []);
  function cancel() {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    setLit([]);
  }
  function move(direction: 1 | -1) {
    if (state !== "play") return;
    const m = { ...selected, direction };
    setBoard((b) => fieldRotate(b, cols, m));
    setHistory((h) => [...h, m]);
    setMoves((n) => n + 1);
  }
  function reset() {
    cancel();
    setBoard(ordered());
    setState("ready");
    setMoves(0);
    setHistory([]);
    setSelected({
      row: Math.floor((rows - 2) / 2),
      col: Math.floor((cols - 2) / 2),
    });
  }
  function scramble() {
    if (state !== "ready") return;
    const g = ++generation.current;
    setState("wave");
    const rings = waveMoves(rows, cols);
    let i = 0;
    function tick() {
      if (!alive.current || g !== generation.current) return;
      if (i === rings.length) {
        setState("play");
        setLit([]);
        return;
      }
      const ring = rings[i++];
      setBoard((b) => ring.reduce((a, m) => fieldRotate(a, cols, m), b));
      setHistory((h) => [...h, ...ring]);
      setLit(
        ring.flatMap((m) => {
          const p = m.row * cols + m.col;
          return [p, p + 1, p + cols, p + cols + 1];
        }),
      );
      timer.current = setTimeout(
        tick,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 15 : 95,
      );
    }
    tick();
  }
  function undo() {
    if (state !== "play" || !history.length) return;
    const m = history.at(-1)!;
    setBoard((b) =>
      fieldRotate(b, cols, { ...m, direction: m.direction === 1 ? -1 : 1 }),
    );
    setHistory((h) => h.slice(0, -1));
    setMoves((n) => Math.max(0, n - 1));
  }
  function exit() {
    cancel();
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    onExit();
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        exit();
        return;
      }
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "q",
          "e",
          "Q",
          "E",
          "Enter",
          " ",
        ].includes(e.key)
      )
        e.preventDefault();
      if (state === "wave") return;
      if (e.key.startsWith("Arrow"))
        setSelected((s) => ({
          row: Math.max(
            0,
            Math.min(
              rows - 2,
              s.row +
                (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0),
            ),
          ),
          col: Math.max(
            0,
            Math.min(
              cols - 2,
              s.col +
                (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0),
            ),
          ),
        }));
      if (e.key.toLowerCase() === "q") move(-1);
      if (e.key.toLowerCase() === "e") move(1);
      if (state === "ready" && (e.key === "Enter" || e.key === " ")) scramble();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className={`god-field ${state}`} ref={root}>
      <div
        className="field-grid"
        role="group"
        aria-label={`${cols} by ${rows} God mode number field`}
      >
        {board.map((v, i) => (
          <button
            key={v}
            tabIndex={-1}
            aria-label={`Number ${v}. Select window at row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}`}
            className={`field-tile ${lit.includes(i) ? "wave-lit" : ""} ${v === i + 1 ? "ordered" : ""} ${[selected.row * cols + selected.col, selected.row * cols + selected.col + 1, (selected.row + 1) * cols + selected.col, (selected.row + 1) * cols + selected.col + 1].includes(i) ? "field-selected" : ""}`}
            style={{
              width: cellW,
              height: cellH,
              transform: `translate(${(i % cols) * cellW}px,${Math.floor(i / cols) * cellH}px)`,
            }}
            onClick={() =>
              state === "play" &&
              setSelected({
                row: Math.min(rows - 2, Math.floor(i / cols)),
                col: Math.min(cols - 2, i % cols),
              })
            }
          >
            {String(v).padStart(3, "0")}
          </button>
        ))}
      </div>
      <div
        className="god-window"
        style={{
          width: cellW * 2,
          height: cellH * 2,
          left: selected.col * cellW,
          top: selected.row * cellH,
        }}
      >
        {state === "ready" ? (
          <button
            className="ignite"
            aria-label="Scramble the field"
            onClick={scramble}
          >
            <span>↻</span>
            <small>AWAKEN THE FIELD</small>
          </button>
        ) : state === "play" ? (
          <div className="god-rotate">
            <button
              onClick={() => move(-1)}
              aria-label="Rotate field window anticlockwise"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => move(1)}
              aria-label="Rotate field window clockwise"
            >
              <RotateCw size={18} />
            </button>
          </div>
        ) : (
          <span className="wave-core">+</span>
        )}
      </div>
      <div className="god-top">
        <button onClick={exit}>
          <ArrowLeft size={15} /> EXIT FIELD
        </button>
        <span>
          GOD MODE <i /> {cols} × {rows}
        </span>
        <button
          aria-label="Enter native full screen"
          onClick={() => void root.current?.requestFullscreen().catch(() => {})}
        >
          <Maximize size={16} />
        </button>
      </div>
      {state === "play" && (
        <div className="god-bottom">
          <div>
            {isSolved ? (
              <span className="gold">ORDER RESTORED.</span>
            ) : (
              <>
                <span>{moves} TURNS</span>
                <span>
                  {board.filter((v, i) => v === i + 1).length}/{board.length} IN
                  PLACE
                </span>
              </>
            )}
          </div>
          <div>
            <button
              onClick={undo}
              disabled={!history.length}
              aria-label="Undo field rotation"
            >
              <Undo2 size={17} />
            </button>
            <button onClick={reset} aria-label="Reset field to ordered state">
              <RefreshCw size={17} />
            </button>
            <button onClick={() => setHelp((h) => !h)}>?</button>
          </div>
        </div>
      )}
      {help && (
        <div className="god-help">
          Select any tile to move the window. Use its arrows to rotate.
          <br />
          Keyboard: arrow keys move · Q / E rotate · Esc leaves.
          <br />
          Undo can reverse your moves and the scramble wave.
        </div>
      )}
      <div className="sr-only" role="status">
        {state === "wave"
          ? "Scrambling the field"
          : state === "ready"
            ? "Ordered field. Activate the gold window to scramble."
            : isSolved
              ? "All numbers are in order"
              : "Select a window and rotate to restore the numbers."}
      </div>
    </div>
  );
}
