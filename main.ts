// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import fs from 'fs';

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (let instance = 6; --instance;) {
  const id = '/i00' + instance;
  const folder = output + id;
  const board = fs.readFileSync(input + id + '/level.txt');
  const stride = board.indexOf(10) + 1;
  const home = board.indexOf(64);
  const steps = [stride, 1, -1, -stride];
  let answer = '';

  // Every subproblem returns the player to the same hallway square.
  // Search slots in reverse so prepended moves keep each route in order.
  for (let slot = 4; slot--;) {
    // Walls use the low bit. The hallway is walkable and carries no box bit.
    let bit = 1, initial = 1, goals = 1;
    const floor = Array.from(board, (tile, cell, row = cell / stride | 0) => {
      if (!(tile % 5)) return 1;
      if (row === 8) return 0;
      if ((cell % stride / 8 | row / 4 & 2) !== slot) return 1;
      // Bitwise operations treat bit 31 identically before and after signed conversion.
      bit += bit;
      initial |= !(tile % 6) && bit;
      goals |= (tile & 2) && bit;
      return bit;
    });

    const seen = {};
    // A zero budget ends the branch when the assignment below returns zero.
    // Array.some supplies three arguments. The remaining defaults compute the move.
    // Player positions and box masks stay integers throughout the search.
    const visit = (
      at, boxes, budget,
      budgets = (seen[boxes] ??= []),
    ) =>
      (boxes & 1) &&
      !(budgets[at] >= budget) &&
      (budgets[at] = budget) &&
      ((at == home && boxes == goals) || steps.some((
        step, direction, _steps,
        next = at + step,
        box = boxes & floor[next],
      ) =>
        // A wall move loses the sentinel. An invalid crate move loses a crate bit.
        visit(next, boxes ^ (box && (box | floor[next + step])), budget - !!box) &&
        (answer = 'drlu'[direction] + answer)
      ));
    for (let bound = 0; !visit(home, initial, ++bound);) {}
  }

  fs.mkdirSync(folder);
  fs.writeFileSync(folder + '/solution.txt', answer);
}
