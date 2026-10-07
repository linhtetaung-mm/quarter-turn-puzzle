# The rotation algorithm

## Your constructive strategy

[Original code: ronumpuz.js, April 30, 2023](https://github.com/linhtetaung-mm/rotate_number_puzzle/blob/main/ronumpuz.js).

There are nine possible 2×2 windows in a 4×4 board, each with two quarter-turn directions: 18 legal actions from a state. A clockwise rotation maps top-left → top-right → bottom-right → bottom-left → top-left. Anticlockwise reverses that cycle.

Your solver does not search those possibilities. It chooses the required tile, finds its position, and uses `goLeft`, `goRight`, `goUp`, and `goDown` to carry it toward the target. Each helper selects a surrounding 2×2 window and direction that moves that tile one cell. Other tiles move too; the ordering of placements keeps that disturbance inside unfinished regions.

1. **First two rows:** place 1–8 in row order. When placing the last column, use a small detour so the preceding placed number is restored.
2. **Lower-left columns:** operate in rows 3 and 4, placing 9, 13, 10 and 14. Special moves insert the bottom tile while restoring the tile above it.
3. **Final square:** only 11, 12, 15 and 16 remain. Rotate that square until the remaining errors can be handled by `keyFormula`. Your five-turn sequences perform exact adjacent transpositions while restoring every other tile. The diagonal case combines two adjacent swaps and a last rotation.

For example, using your zero-based window indices, `4−, 2−, 4+, 5+, 2+` exchanges positions 11 and 12 and leaves all other positions fixed. Here + means clockwise, − anticlockwise, and positions are numbered 1–16 in row order. The related `7−, 5−, 7+, 8+, 5+` exchanges 15 and 16. This is the heart of the original method: controlled local permutations with no net disturbance outside the intended swap.

The UI’s A1–C3 labels refer to the top-left corner of the selected window, not to tile values. One move is one 90° turn; a 180° rotation costs two moves.

## What was preserved and improved

The original source is saved unchanged in `docs/original/`. The adaptation isolates its state per invocation, removes the console demo and records each rotation and its stage. Its row placement, column placement and swap formulas are preserved.

The original is fast and predictable on the fixed board, but it does not minimize move count. Global mutable variables, random demo initialization and direct console output previously made it unsuitable for a reusable interface. The refactor validates inputs, computes in a worker, records playback, and independently replays every solution before displaying it.

The refined option removes cycles from the original route: whenever a board state repeats, all moves between its two visits can be discarded. The remaining path reaches the same goal and can never be longer. It is still constructive, not globally optimal. The supplied example takes 41 turns in both modes; the seeded 10,000-board test saved 4,664 turns in total, and the longest refined route observed was 64 turns. No general 64-turn upper bound is claimed.

## Alternative: IDA*

[Richard Korf’s primary research on iterative deepening and pattern databases](https://web.cs.ucla.edu/~korf/publications.html) provides the basis for the search alternative. IDA* does a depth-first search with increasing limits on `g + h`: moves used plus a lower bound on the remaining moves. With an admissible bound and complete iterations, the first discovered route is optimal under the chosen move cost.

For this puzzle, a suitable elementary lower bound is:

```
h = max(ceil(total Manhattan distance / 4), ceil(misplaced tile count / 4))
```

Each quarter turn moves four tiles exactly one orthogonal cell, so it can decrease total Manhattan distance by at most four and can correct at most four tiles. Neither bound overestimates. Taking their maximum remains admissible. Directly using total Manhattan distance, without dividing by four, would overestimate and lose optimality.

This implementation omits immediate inverse moves, paths revisiting their own states, and three consecutive rotations of the same window (equivalent to one inverse turn). It orders candidate moves by the heuristic. Search stops at depth 10, 350,000 visited nodes, or roughly 1.8 seconds. A completed search is labeled optimal. An unfinished search uses the independently verified constructive solution and explicitly says it fell back. A deep board whose lower bound already exceeds 10 skips the bounded search.

IDA* can save many turns on shallow boards and uses less memory than retaining a huge breadth-first frontier. It is not necessarily faster than your constructive solver on deeply scrambled boards. Pattern databases would supply stronger admissible estimates for selected tile groups and make deeper searches more useful. One must combine them using a maximum or valid cost partitioning: one quarter turn may affect tiles in several groups, so simply summing independently computed pattern distances can overestimate.

Bidirectional BFS is another exact option for shallow scrambles. It is attractive when both the start and goal are known, but its frontiers still grow quickly. Full-state exhaustive search is impractical: the board has up to 16! = 20,922,789,888,000 permutations. Your constructive method is therefore an excellent default for responsive solving; bounded search is a useful supplement for short solutions.

## God mode

God mode uses a dimension-independent pure quarter-turn operation. Its scramble visits windows in rings sorted by distance from the center, with angular ordering inside each ring, and alternates direction by row/column parity. Three passes make a wave travel outward, inward, then outward again. All values are preserved, and reversing the recorded turns exactly restores the ordered field.

It uses legal scrambling rather than random permutation generation, so reachability is guaranteed by construction. It is a manual mode; the original formulas contain fixed 4×4 window indices and are not silently generalized to the large field.
