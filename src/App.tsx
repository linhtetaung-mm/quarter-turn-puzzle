import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  RotateCw,
  RotateCcw,
  Undo2,
  RefreshCw,
  Shuffle,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  X,
  Check,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import Board, { type Motion } from "./Board";
import GodMode from "./GodMode";
import {
  goal,
  original,
  scramble,
  rotate,
  inverse,
  solved,
  validate,
  label,
  type Move,
} from "./puzzle/model";
import type { Solution } from "./puzzle/solver";
const stages = [
  "Find the first rows",
  "Build the lower columns",
  "The final square",
];
export default function App() {
  const [mode, setMode] = useState<"play" | "solver" | "god">("play"),
    [board, setBoard] = useState(original),
    [initial, setInitial] = useState(original),
    [selected, setSelected] = useState(4),
    [history, setHistory] = useState<Move[]>([]);
  const [motion, setMotion] = useState<Motion | null>(null),
    [busy, setBusy] = useState(false),
    [plan, setPlan] = useState<(Solution & { start: number[] }) | null>(null),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [strategy, setStrategy] = useState("refined");
  const [difficulty, setDifficulty] = useState("original"),
    [seconds, setSeconds] = useState(0),
    [targets, setTargets] = useState(false),
    [message, setMessage] = useState(
      "Select a window. Give order a little twist.",
    ),
    [hint, setHint] = useState<Move | null>(null),
    [modal, setModal] = useState<"help" | "algorithm" | "custom" | null>(null),
    [draft, setDraft] = useState(""),
    [error, setError] = useState("");
  const generation = useRef(0),
    frame = useRef(0),
    worker = useRef<Worker | null>(null),
    boardRef = useRef(board),
    lockRef = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  boardRef.current = board;
  lockRef.current = busy || !!motion;
  const complete = solved(board),
    count = board.filter((v, i) => v === i + 1).length,
    locked = busy || !!motion;
  useEffect(() => {
    if (mode !== "play" || !history.length || complete) return;
    const id = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [mode, history.length, complete]);
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (modal) {
      restoreFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      restoreFocus.current?.focus();
    }
  }, [modal]);
  function cancel() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    cancelAnimationFrame(frame.current);
    setBusy(false);
    setMotion(null);
    setPlaying(false);
    lockRef.current = false;
  }
  function clearPlan() {
    setPlan(null);
    setCursor(0);
    setHint(null);
  }
  function load(b: number[], text: string) {
    cancel();
    setBoard(b);
    setInitial(b);
    setHistory([]);
    clearPlan();
    setSeconds(0);
    setMessage(text);
  }
  function choose(value: string) {
    setDifficulty(value);
    load(
      value === "original"
        ? original
        : scramble(
            ({ gentle: 5, mixed: 24, deep: 80 } as Record<string, number>)[
              value
            ] ?? 24,
          ),
      "A new arrangement. Make your first turn.",
    );
  }
  function changeMode(next: "play" | "solver") {
    cancel();
    clearPlan();
    if (next === "play" && mode === "solver") {
      setInitial(boardRef.current.slice());
      setHistory([]);
      setSeconds(0);
    }
    setMode(next);
    setMessage(
      next === "solver"
        ? "Let the algorithm make its thinking visible."
        : "Select a window. Give order a little twist.",
    );
  }
  function god() {
    cancel();
    setMode("god");
  }
  function animate(move: Move, done?: () => void) {
    if (lockRef.current) return;
    lockRef.current = true;
    const id = generation.current,
      from = boardRef.current.slice();
    setSelected(move.window);
    setHint(null);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 360 / speed;
    let start = 0;
    function tick(t: number) {
      if (id !== generation.current) return;
      if (!start) start = t;
      const p = duration ? Math.min(1, (t - start) / duration) : 1;
      setMotion({ from, move, progress: p * p * (3 - 2 * p) });
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else {
        const next = rotate(from, move);
        boardRef.current = next;
        setBoard(next);
        setMotion(null);
        lockRef.current = false;
        done?.();
      }
    }
    frame.current = requestAnimationFrame(tick);
  }
  function manual(direction: 1 | -1) {
    if (locked || playing || mode !== "play") return;
    const move = { window: selected, direction };
    clearPlan();
    animate(move, () => {
      setHistory((h) => [...h, move]);
      setMessage(label(move));
    });
  }
  function undo() {
    if (locked || !history.length) return;
    const m = history.at(-1)!;
    clearPlan();
    animate(inverse(m), () => {
      setHistory((h) => h.slice(0, -1));
      setMessage("Last turn undone.");
    });
  }
  function compute(forHint = false) {
    if (locked || playing) return;
    cancel();
    const id = generation.current,
      start = boardRef.current.slice();
    setBusy(true);
    lockRef.current = true;
    setMessage(
      forHint
        ? "Finding a helpful next turn…"
        : "Planning a route back to order…",
    );
    const w = new Worker(
      new URL("./puzzle/solver.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    w.onmessage = (e) => {
      if (id !== generation.current) return;
      w.terminate();
      worker.current = null;
      setBusy(false);
      lockRef.current = false;
      if (e.data.error) {
        setMessage(e.data.error);
        return;
      }
      const result = e.data.result as Solution;
      if (forHint) {
        const next = result.moves[0];
        setHint(next ?? null);
        if (next) {
          setSelected(next.window);
          setMessage(`Try ${label(next)}. Press Apply hint to turn.`);
        } else setMessage("Every number is already in place.");
      } else {
        setPlan({ ...result, start });
        setCursor(0);
        setMessage(
          result.moves.length
            ? `Route verified. ${result.moves.length} quarter turns to order.`
            : "Already in order. No turns needed.",
        );
      }
    };
    w.onerror = () => {
      if (id !== generation.current) return;
      w.terminate();
      setBusy(false);
      lockRef.current = false;
      setMessage("Solver could not start. Please try again.");
    };
    w.postMessage({ board: start, strategy: forHint ? "refined" : strategy });
  }
  function step(direction: 1 | -1) {
    if (!plan || locked) return;
    const idx = direction === 1 ? cursor : cursor - 1;
    if (idx < 0 || idx >= plan.moves.length) return;
    const m = plan.moves[idx];
    animate(direction === 1 ? m : inverse(m), () => {
      setCursor((c) => c + direction);
      setMessage(direction === 1 ? label(m) : "Previous turn restored.");
    });
  }
  useEffect(() => {
    if (!playing || !plan || locked) return;
    if (cursor >= plan.moves.length) {
      setPlaying(false);
      setMessage("Order restored. Every number, exactly where it belongs.");
      return;
    }
    const timer = setTimeout(() => step(1), 180 / speed);
    return () => clearTimeout(timer);
  }, [playing, plan, cursor, locked, speed]);
  useEffect(() => {
    if (mode === "god" || modal) return;
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "q",
          "e",
          "Q",
          "E",
        ].includes(e.key)
      )
        e.preventDefault();
      if (locked || playing) return;
      if (e.key.startsWith("Arrow"))
        setSelected((s) => {
          let r = Math.floor(s / 3),
            c = s % 3;
          if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
          if (e.key === "ArrowRight") c = Math.min(2, c + 1);
          if (e.key === "ArrowUp") r = Math.max(0, r - 1);
          if (e.key === "ArrowDown") r = Math.min(2, r + 1);
          return r * 3 + c;
        });
      if (e.key.toLowerCase() === "q") manual(-1);
      if (e.key.toLowerCase() === "e") manual(1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function custom() {
    cancel();
    setDraft(
      Array.from({ length: 4 }, (_, r) =>
        board.slice(r * 4, r * 4 + 4).join(" "),
      ).join("\n"),
    );
    setError("");
    setModal("custom");
  }
  function applyCustom() {
    try {
      const b = draft
        .trim()
        .replace(/[\[\],]/g, " ")
        .split(/\s+/)
        .map(Number);
      validate(b);
      load(
        b,
        "Your arrangement is ready. All valid 4×4 permutations are playable.",
      );
      setDifficulty("custom");
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid board");
    }
  }
  const next = plan?.moves[cursor];
  const searchPhases = strategy === "search" && (!plan || plan.optimal);
  const phaseNames = searchPhases
    ? [
        "Estimate remaining turns",
        "Search deeper routes",
        "Replay the shortest route",
      ]
    : stages;
  const displayStage = searchPhases
    ? 3
    : (next?.stage ?? plan?.moves.at(-1)?.stage ?? 1);
  return mode === "god" ? (
    <GodMode
      onExit={() => {
        setMode("play");
        setMessage("Back from the field. Your 4×4 board is here.");
      }}
    />
  ) : (
    <div className="app">
      <header>
        <a className="brand" href="/" aria-label="Quarter Turn home">
          <span className="brand-icon">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            QUARTER<span className="brand-light">TURN</span>
            <small>AN EXPERIMENT IN ORDER</small>
          </span>
        </a>
        <nav aria-label="Puzzle modes">
          <button
            className={mode === "play" ? "active" : ""}
            onClick={() => changeMode("play")}
          >
            01 <span>Play</span>
          </button>
          <button
            className={mode === "solver" ? "active" : ""}
            onClick={() => changeMode("solver")}
          >
            02 <span>Algorithm</span>
          </button>
          <button className="god-mode-button" onClick={god}>
            <span className="god-star">✧</span> God mode{" "}
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <button className="help-button" onClick={() => setModal("help")}>
          HOW TO PLAY <ArrowUpRight size={14} />
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">
              <i /> SIXTEEN NUMBERS. NINE POSSIBILITIES.
            </p>
            <h1>
              A LITTLE CHAOS.
              <br />
              <span>A QUARTER TURN.</span>
            </h1>
            <p className="intro-copy">
              Four numbers move. Everything changes.
              <br />
              Rotate a square. Find your way back to order.
            </p>
          </div>
          <div className="edition">
            <span>№ 06</span>
            <small>THE ROTATION SERIES</small>
            <div className="edition-orbit">↻</div>
          </div>
        </section>
        <section className="workspace">
          <div className="board-panel">
            <div className="panel-heading">
              <span>
                <i className="status-dot" />
                {mode === "play" ? "MANUAL CONTROL" : "ALGORITHM CONTROL"}
              </span>
              <span className="live-label">
                {complete
                  ? "ORDER RESTORED"
                  : busy
                    ? "COMPUTING"
                    : motion
                      ? "ROTATING"
                      : "SYSTEM READY"}
              </span>
            </div>
            <div className="board-stage">
              <Board
                board={board}
                selected={selected}
                onSelect={(n) => {
                  if (!locked && !playing) {
                    setSelected(n);
                    setHint(null);
                  }
                }}
                motion={motion}
                locked={locked || playing || mode === "solver"}
                targets={targets}
              />
            </div>
            <div className="board-stats">
              <div>
                <small>QUARTER TURNS</small>
                <strong>
                  {String(mode === "solver" ? cursor : history.length).padStart(
                    2,
                    "0",
                  )}
                </strong>
              </div>
              <div>
                <small>IN POSITION</small>
                <strong>
                  {String(count).padStart(2, "0")}
                  <span> / 16</span>
                </strong>
              </div>
              <div>
                <small>
                  {mode === "solver" ? "ROUTE LENGTH" : "ELAPSED TIME"}
                </small>
                <strong>
                  {mode === "solver"
                    ? plan
                      ? String(plan.moves.length).padStart(2, "0")
                      : "—"
                    : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}
                </strong>
              </div>
            </div>
            <div
              className={`status-line ${complete ? "success" : ""}`}
              role="status"
            >
              {complete ? (
                <Check size={15} />
              ) : (
                <span className="tiny-plus">+</span>
              )}{" "}
              {complete ? "Order restored. Nicely turned." : message}
            </div>
          </div>
          <aside>
            <div className="setup-card">
              <div className="card-label">
                THE ARRANGEMENT <span>01 — 16</span>
              </div>
              <div className="select-line">
                <select
                  aria-label="Puzzle arrangement"
                  value={difficulty}
                  onChange={(e) => choose(e.target.value)}
                  disabled={locked || playing}
                >
                  <option value="original">Original challenge</option>
                  <option value="gentle">Gentle · 5 shuffle turns</option>
                  <option value="mixed">Mixed · 24 shuffle turns</option>
                  <option value="deep">Deep · 80 shuffle turns</option>
                  {difficulty === "custom" && (
                    <option value="custom">Custom arrangement</option>
                  )}
                </select>
                <button
                  className="square-btn"
                  aria-label="Shuffle a new puzzle"
                  onClick={() =>
                    choose(
                      difficulty === "original" || difficulty === "custom"
                        ? "mixed"
                        : difficulty,
                    )
                  }
                  disabled={locked || playing}
                >
                  <Shuffle size={17} />
                </button>
              </div>
              <div className="setup-links">
                <button onClick={custom}>
                  Set your own numbers <ArrowUpRight size={12} />
                </button>
                <button
                  onClick={() => setTargets((t) => !t)}
                  aria-pressed={targets}
                >
                  <span className={`checkbox ${targets ? "checked" : ""}`}>
                    {targets && <Check size={9} />}
                  </span>{" "}
                  Targets
                </button>
              </div>
            </div>
            {mode === "play" ? (
              <div className="control-card">
                <div className="card-label">
                  YOUR ROTATION WINDOW{" "}
                  <span>
                    {String.fromCharCode(65 + Math.floor(selected / 3))}
                    {(selected % 3) + 1}
                  </span>
                </div>
                <div className="window-picker">
                  <div
                    className="mini-windows"
                    role="group"
                    aria-label="Select one of nine rotation windows"
                  >
                    {Array.from({ length: 9 }, (_, i) => (
                      <button
                        key={i}
                        aria-label={`Select window ${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}`}
                        aria-pressed={selected === i}
                        className={selected === i ? "selected" : ""}
                        disabled={locked || playing}
                        onClick={() => setSelected(i)}
                      >
                        <span />
                      </button>
                    ))}
                  </div>
                  <p>
                    Pick a 2 × 2 window.
                    <br />
                    Then give it a turn.
                    <small>You can also select on the board.</small>
                  </p>
                </div>
                <div className="rotate-buttons">
                  <button
                    onClick={() => manual(-1)}
                    disabled={locked || playing}
                  >
                    <RotateCcw size={23} />
                    <span>
                      Anticlockwise<kbd>Q</kbd>
                    </span>
                  </button>
                  <button
                    onClick={() => manual(1)}
                    disabled={locked || playing}
                  >
                    <RotateCw size={23} />
                    <span>
                      Clockwise<kbd>E</kbd>
                    </span>
                  </button>
                </div>
                <div className="utility-buttons">
                  <button disabled={locked || !history.length} onClick={undo}>
                    <Undo2 size={15} /> Undo
                  </button>
                  <button
                    disabled={locked}
                    onClick={() =>
                      load(initial, "Back to the starting arrangement.")
                    }
                  >
                    <RefreshCw size={14} /> Reset
                  </button>
                  <button
                    disabled={locked || complete}
                    onClick={() => {
                      if (hint) {
                        const m = hint;
                        clearPlan();
                        animate(m, () => {
                          setHistory((h) => [...h, m]);
                          setMessage("Hint applied. Keep going.");
                        });
                      } else compute(true);
                    }}
                  >
                    <Lightbulb size={14} /> {hint ? "Apply hint" : "Hint"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="control-card solver-card">
                <div className="card-label">
                  THE SOLVING ENGINE <SlidersHorizontal size={14} />
                </div>
                <select
                  aria-label="Solving algorithm"
                  value={strategy}
                  disabled={locked || playing}
                  onChange={(e) => {
                    setStrategy(e.target.value);
                    clearPlan();
                  }}
                >
                  <option value="refined">
                    Your algorithm · refined route
                  </option>
                  <option value="original">Your original 2023 algorithm</option>
                  <option value="search">IDA* · bounded shortest search</option>
                </select>
                <div className="phase-list">
                  {phaseNames.map((s, i) => (
                    <div
                      key={s}
                      className={
                        plan && displayStage === i + 1 ? "current" : ""
                      }
                    >
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <p>{s}</p>
                      {plan && displayStage > i + 1 ? (
                        <Check size={13} />
                      ) : (
                        <i />
                      )}
                    </div>
                  ))}
                </div>
                {!plan ? (
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={() => compute()}
                  >
                    {busy ? "Finding the route…" : "Find a solution"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <>
                    <div className="route-info">
                      <span>{plan.moves.length} verified turns</span>
                      <span>{Math.round(plan.elapsed)} ms</span>
                    </div>
                    <div className="playback">
                      <button
                        aria-label="Previous solver turn"
                        disabled={locked || playing || cursor === 0}
                        onClick={() => step(-1)}
                      >
                        <ChevronLeft size={19} />
                      </button>
                      <button
                        className="primary-button"
                        disabled={cursor >= plan.moves.length}
                        onClick={() => setPlaying((p) => !p)}
                      >
                        {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
                        {playing ? "Pause" : "Play route"}
                      </button>
                      <button
                        aria-label="Next solver turn"
                        disabled={
                          locked || playing || cursor >= plan.moves.length
                        }
                        onClick={() => step(1)}
                      >
                        <ChevronRight size={19} />
                      </button>
                    </div>
                    <div className="solver-progress">
                      <i
                        style={{
                          width: `${plan.moves.length ? (cursor / plan.moves.length) * 100 : 100}%`,
                        }}
                      />
                    </div>
                    <div className="speed-control">
                      <button
                        disabled={locked}
                        onClick={() => {
                          cancel();
                          setBoard(plan.start);
                          setCursor(0);
                        }}
                      >
                        Restart route
                      </button>
                      <select
                        aria-label="Playback speed"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                      >
                        {[0.5, 1, 2, 4].map((v) => (
                          <option key={v} value={v}>
                            {v}× speed
                          </option>
                        ))}
                      </select>
                    </div>
                    <small className="route-caption">
                      {plan.strategy}
                      {plan.optimal ? " · optimal" : ""}
                    </small>
                  </>
                )}
              </div>
            )}
            <div className="goal-card">
              <div>
                <span className="card-label">THE DESTINATION</span>
                <p>
                  A place for every number.
                  <br />
                  Left to right. Top to bottom.
                </p>
                <span className="goal-note">
                  <i /> A lit dot means it’s in place.
                </span>
              </div>
              <div
                className="goal-grid"
                aria-label="Goal: numbers 1 through 16 in row order"
              >
                {goal().map((v) => (
                  <span key={v}>{String(v).padStart(2, "0")}</span>
                ))}
              </div>
            </div>
          </aside>
        </section>
        <section className="lower-section">
          <button
            className="algorithm-teaser"
            onClick={() => setModal("algorithm")}
          >
            <span className="teaser-icon">↳</span>
            <span>
              <small>BUILT ON A HUMAN IDEA</small>
              <strong>A little method behind the madness.</strong>
              <p>Explore Lin Htet Aung’s three-stage solving algorithm.</p>
            </span>
            <ArrowUpRight size={21} />
          </button>
          <button className="god-teaser" onClick={god}>
            <span className="god-star">✧</span>
            <span>
              <small>BEYOND SIXTEEN</small>
              <strong>Think bigger.</strong>
              <p>Enter an endless-looking field of numbers.</p>
            </span>
            <Maximize2 size={18} />
          </button>
        </section>
      </main>
      <footer>
        <span>
          QUARTER TURN <i /> DESIGNED TO BE TURNED.
        </span>
        <a
          href="https://github.com/linhtetaung-mm/rotate_number_puzzle"
          target="_blank"
          rel="noreferrer"
        >
          ORIGINAL ALGORITHM BY LIN HTET AUNG <ArrowUpRight size={12} />
        </a>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close dialog"
          onClick={() => setModal(null)}
        >
          <X size={20} />
        </button>
        {modal === "help" && (
          <>
            <p className="eyebrow">A SMALL GUIDE TO ORDER</p>
            <h2>Four at a time.</h2>
            <p>
              The goal is to arrange 1 through 16 from left to right, top to
              bottom. Every turn rotates all four numbers in a selected 2 × 2
              window by 90°.
            </p>
            <ol>
              <li>
                <strong>Choose a window.</strong> Select a tile or use the
                nine-square selector.
              </li>
              <li>
                <strong>Make a turn.</strong> Clockwise or anticlockwise. A gold
                outline marks the four numbers that move.
              </li>
              <li>
                <strong>Follow the dots.</strong> A gold dot marks a number in
                its target position. It can still move.
              </li>
            </ol>
            <p>
              Use arrow keys to move the window and Q / E to rotate when the
              page is focused. Undo reverses your last turn. Hint suggests a
              move from your algorithm, without moving the board until you apply
              it.
            </p>
            <h3>Three ways to explore</h3>
            <p>
              <strong>Play:</strong> find your own route.{" "}
              <strong>Algorithm:</strong> watch a verified solution, one turn at
              a time. <strong>God mode:</strong> a screen-sized field, scrambled
              by a wave of legal turns. Select a tile to reposition its gold
              window, then rotate with the arrows or Q / E. Escape returns here.
            </p>
          </>
        )}
        {modal === "algorithm" && (
          <>
            <p className="eyebrow">THE METHOD BEHIND THE MOTION</p>
            <h2>Order, in three acts.</h2>
            <p>
              Your April 30, 2023 algorithm is a constructive solver. It
              deliberately places tiles instead of searching the enormous space
              of full boards.
            </p>
            <ol>
              <li>
                <strong>The first rows.</strong> Directional helpers choose a
                rotation that carries a chosen number left, right, up or down.
                Special last-column moves protect the earlier placements.
              </li>
              <li>
                <strong>The lower columns.</strong> Work inside the final two
                rows, placing the left columns and leaving one 2 × 2 square.
              </li>
              <li>
                <strong>The key formula.</strong> Your five-turn sequences swap
                adjacent numbers while restoring the surrounding tiles. Diagonal
                swaps combine two sequences and a final turn.
              </li>
            </ol>
            <h3>What the refactor adds</h3>
            <p>
              The original placement and swap formulas are preserved. Every
              route is independently replayed before it is shown. The refined
              option removes complete loops from that route, saving turns
              without changing the result. Neither constructive option
              guarantees the shortest route.
            </p>
            <h3>A different kind of solver</h3>
            <p>
              IDA* searches progressively deeper paths using a lower bound: the
              larger of total Manhattan distance ÷ 4 and misplaced tiles ÷ 4,
              each rounded up. A turn moves four tiles one cell, so these bounds
              never overestimate.
            </p>
            <p>
              The search here is limited to depth 10, 350,000 visited nodes and
              roughly 1.8 seconds. If it finishes, its route is shortest in
              quarter turns. Otherwise it returns the verified constructive
              route. Pattern databases could make deeper searches more
              practical; they need memory and careful cost accounting because
              one turn affects several tiles.
            </p>
            <a
              className="source-link"
              href="https://github.com/linhtetaung-mm/rotate_number_puzzle/blob/main/ronumpuz.js"
              target="_blank"
              rel="noreferrer"
            >
              Your original source <ArrowUpRight size={14} />
            </a>
            <a
              className="source-link"
              href="https://web.cs.ucla.edu/~korf/publications.html"
              target="_blank"
              rel="noreferrer"
            >
              Korf’s search research <ArrowUpRight size={14} />
            </a>
          </>
        )}
        {modal === "custom" && (
          <>
            <p className="eyebrow">YOUR OWN ARRANGEMENT</p>
            <h2>Set the numbers.</h2>
            <p>
              Enter each number from 1 to 16 exactly once. Spaces, commas and
              JSON arrays all work. Every valid permutation is reachable with
              these quarter turns.
            </p>
            <textarea
              aria-label="Custom board numbers"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              spellCheck={false}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" onClick={applyCustom}>
              Use this board <ArrowRight size={16} />
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
