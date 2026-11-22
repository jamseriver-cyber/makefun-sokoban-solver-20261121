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
  const steps = [stride, 1, -stride, -1];
  let answer = '';

  // Every subproblem returns the player to the same hallway square.
  // Search slots in reverse so prepended moves keep each route in order.
  for (let slot = 4; slot--;) {
    // Walls use the low bit. The hallway is on row 8 and stays walkable.
    // Rows 7 and 9 contain all doorways. The low bit of the row closes
    // those doors when they belong to another room.
    let bit = 1, initial = 1, goals = 1;
    const floor = Array.from(board, (tile, cell, row = cell / stride) => {
      if (!(tile % 5)) return 1;
      if ((cell % stride / 8 | row / 4 & 2) != slot || !(row & 7)) return row & 1;
      bit <<= 1;
      initial |= tile % 6 ? 0 : bit;
      goals |= (tile & 2) && bit;
      return bit;
    });

    const seen = {};
    // Budgets are positive, with 1 representing zero pushes remaining.
    // Array.some supplies three arguments. The remaining defaults compute the move.
    const visit = (
      at, boxes, budget,
      budgets = (seen[boxes] ||= []),
    ) =>
      (boxes & 1) &&
      (budgets[at] || 0) < budget &&
      (budgets[at] = budget) &&
      ((at === home && boxes === goals) || steps.some((
        step, direction, _steps,
        next = at + step,
        box = boxes & floor[next],
      ) =>
        // A wall move loses the sentinel. An invalid crate move loses a crate bit.
        visit(next, boxes ^ (box && (box | floor[next + step])), budget - !!box) &&
        (answer = 'drul'[direction] + answer)
      ));
    for (let bound = 0; !visit(home, initial, ++bound);) {}
  }

  fs.mkdirSync(folder);
  fs.writeFileSync(folder + '/solution.txt', answer);
}
