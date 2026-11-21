// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import fs from 'fs';

const input = (process.env.MAKEFUN_INPUT_DIR ?? '/input') + '/';
const output = (process.env.MAKEFUN_OUTPUT_DIR ?? '/output') + '/';

for (const id of fs.readdirSync(input)) {
  const folder = output + id;
  const board = fs.readFileSync(input + id + '/level.txt');
  const stride = board.indexOf(10) + 1;
  const home = board.indexOf(64);
  const steps = [-stride, stride, -1, 1];
  let answer = '';

  // Every subproblem returns the player to the same hallway square.
  // Search slots in reverse so prepended moves keep each route in order.
  for (let slot = 4; slot--;) {
    let bit = 1, initial = 0, goals = 0;
    const floor = Array.from(board, (tile, cell) => {
      // The wall '#' (35) is odd, and line separators fall below space (32).
      if ((tile & 1) || tile < 32) return 0;
      const row = cell / stride | 0;
      if (row === 8) return 1;
      if (((cell % stride > 7) | (row > 8) * 2) !== slot) return 0;
      bit <<= 1;
      // Only '$' (36) and '*' (42) are divisible by six.
      initial |= tile % 6 ? 0 : bit;
      // Only '.' (46) and '*' (42) have their second bit set.
      goals |= tile & 2 ? bit : 0;
      return bit;
    });

    // Keep the highest remaining push budget previously seen for a state.
    const seen = new Map();
    // Budgets are positive, with 1 representing zero pushes remaining.
    for (let bound = 13; !visit(home, initial, bound); bound++) {}

    function visit(at, boxes, budget) {
      // All board positions are below 512, including line separators.
      const key = boxes * 512 + at;
      if ((seen.get(key) | 0) >= budget) return false;
      seen.set(key, budget);
      return (at === home && boxes === goals) || steps.some((step, direction) => {
        const next = at + step;
        const box = boxes & floor[next];
        const target = box && floor[next + step] & ~boxes & -2;
        return floor[next] && (!box || target) &&
          visit(next, boxes ^ box ^ target, budget - !!box) &&
          (answer = 'udlr'[direction] + answer);
      });
    }
  }

  fs.mkdirSync(folder);
  fs.writeFileSync(folder + '/solution.txt', answer);
}
