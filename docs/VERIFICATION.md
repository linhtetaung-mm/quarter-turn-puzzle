# Verification

## Automated

`npm test` passes seven engine tests:

1. All nine 4×4 windows rotate as expected, invert exactly, and return after four quarter turns. Rotation is checked against an independently implemented grid operation.
2. The original example and all 24 possible final-square arrangements solve correctly.
3. 10,000 seeded arbitrary permutations solve through both the original and refined solvers. Inputs remain unchanged, independent replay reaches the goal, and refinement never lengthens a route. The longest observed refined route was 64 turns; loop removal saved 4,664 turns across the sample.
4. Bounded IDA* agrees with exhaustive breadth-first distances for every distinct board within two quarter turns of the goal. The heuristic does not exceed those known distances.
5. Loop removal preserves the intended endpoint.
6. Input validation rejects duplicates, missing numbers, fractions and out-of-range values.
7. God mode waves are legal and produce non-ordered boards for 4×4, 9×16, 10×5 and 16×24 fields. Each retains every number exactly once, and reversing every recorded move restores the initial ordered field.

`npm run build` checks TypeScript and builds the app and Web Worker successfully.

## Browser checks

The local preview was checked in the Codex in-app browser at desktop and phone sizes (1366×950 and 390×844):

- A clockwise turn of B2 moved its four tiles correctly, and undo restored the starting board.
- Algorithm mode returned 41 turns for the original example; animated playback at 4× reached 1–16 in order.
- Custom input rejected a duplicate 15, accepted the correct sixteen-number input, and closed the editor on success.
- A hint selected A1 clockwise and waited for explicit application.
- God mode opened an ordered 16×11 desktop field and a 5×10 phone field.
- Clicking the central window triggered the legal scramble wave and enabled manual controls afterwards.
- Clockwise rotation and undo restored the same field state and move count.
- Selecting the top-left tile relocated the window to the top-left corner; anticlockwise rotation worked there.
- Reset returned the field to order and restored the central scramble control. Exit returned to the standard puzzle.
- Responsive board, control cards, modal layout and full-screen field were visually inspected.

The immersive God mode uses a fixed viewport surface. Native browser full screen is optional via its maximize control, so the mode stays usable in embedded browsers. Sessions are in memory; reload clears progress. The extensive random test is evidence for this implementation, not an exhaustive proof over all 16! permutations.
