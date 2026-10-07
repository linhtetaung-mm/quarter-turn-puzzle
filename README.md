# Quarter Turn

An original **obsidian and gold**, industrial-style interface for Lin Htet Aung’s [rotate_number_puzzle](https://github.com/linhtetaung-mm/rotate_number_puzzle). Built with React, TypeScript and Vite in this folder. It does not reuse the slide puzzle design.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. `npm test` verifies the puzzle engines. `npm run build` checks TypeScript and creates the production build in `dist/`. `npm run preview` serves that build.

## Three modes

- **Play:** a 4×4 board with nine selectable 2×2 windows. Choose a tile or the window selector; rotate clockwise or anticlockwise. Quarter turns follow circular paths with upright numbers. Undo, reset, hints, target labels, generated scrambles and validated custom boards are included. Arrow keys move the selection; Q / E rotate. All 16 numbers remain present.
- **Algorithm:** the original three-stage constructive algorithm, a refined route with loops removed, and a bounded IDA* search. The solver runs in a Web Worker and independently verifies the returned route. Play, pause, restart, previous/next steps and playback speed controls are included. A pause finishes the current turn. Changing modes or loading a board cancels pending animation and computation.
- **God mode:** a borderless field filling the viewport, initially ordered, with a glowing golden 2×2 window in the center. Click that window to send concentric waves of legal rotations outward, inward and outward again. The field has 4–24 columns and 4–16 rows, chosen on entry to fit the screen. Its dimensions remain stable during resizing; the cells rescale to avoid losing the puzzle. Select a tile to relocate the window; use the two arrows or Q / E to rotate. Arrow keys move it, undo reverses a turn, reset restores the ordered field, and Escape/Exit returns to the standard puzzle. The corner maximize button requests native browser full screen when supported. The field itself works without that permission or browser feature.

God mode is a manual puzzle, with a reversible scramble, not an extension of the fixed 4×4 auto solver. Its moves are all legal, so generated fields are reachable. The original 4×4 swap formulas are deliberately not applied to arbitrary field dimensions.

## The original idea

The source is preserved under `docs/original/`. `src/puzzle/legacy.js` adapts `ronumpuz.js` into an isolated function, removes console output and random demo setup, and records the window, direction and phase for every rotation. Placement logic and key formulas remain the author’s.

The supplied level-29 example from `april29.js` is the opening board. Both original and refined solvers use **41 quarter turns** on this example. Across 10,000 seeded random permutations, loop removal saved **4,664 total turns**, and the longest observed refined route used **64 turns**. These are measurements, not a universal bound or an optimality claim.

See [algorithm explanation](docs/ALGORITHM.md) and [verification](docs/VERIFICATION.md). The same explanation is available in the app.

## Source map

- `src/App.tsx`: play, input validation, solver lifecycle, playback and dialogs.
- `src/Board.tsx`: board layout and circular quarter-turn interpolation.
- `src/GodMode.tsx`: responsive full-screen field, wave lifecycle and manual controls.
- `src/puzzle/model.ts`: pure 4×4 rotation and validation.
- `src/puzzle/legacy.js`: preserved constructive logic with move recording.
- `src/puzzle/solver.ts`: replay verification, loop removal and bounded IDA*.
- `src/puzzle/solver.worker.ts`: background solving.
- `src/puzzle/field.ts`: general rectangular rotations and wave planning.
- `tests/puzzle.test.mjs`: independent replay, randomized solver and reversible field checks.

Google Fonts are optional; local font fallbacks are defined. Reduced-motion preferences disable interpolated turns and shorten the scramble wave. Play sessions live in memory and reload starts over. No backend, account or external image asset is required. The original algorithm is credited to Lin Htet Aung; this refactor does not impose a license on his source.
