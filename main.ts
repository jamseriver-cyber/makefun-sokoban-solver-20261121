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
    // At zero budget the assignment is false and the branch stops.
    // Array.some supplies the step array as its third argument. The box default reuses that binding for the next square.
    const visit = (
      at, boxes, budget,
      budgets = (seen[boxes] ||= []),
    ) =>
      (boxes & 1) &&
      !(budgets[at] >= budget) &&
      (budgets[at] = budget) &&
      ((at == home && boxes == goals) || steps.some((step, direction, next, box = boxes & floor[next = at + step]) =>
        visit(next, boxes ^ (box && (box | floor[next + step])), budget - !!box) && (answer = 'drul'[direction] + answer)
      ));
    for (let bound = 0; !visit(home, initial, ++bound);) {}
  }

  fs.mkdirSync(folder);
  fs.writeFileSync(folder + '/solution.txt', answer);
}
