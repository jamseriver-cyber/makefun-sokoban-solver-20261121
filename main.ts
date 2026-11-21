// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import fs from 'node:fs';

const moves = 'udlr';

function solve(level) {
  const board = level.replace(/\r/g, '').split('');
  const stride = board.indexOf('\n') + 1;
  const steps = [-stride, stride, -1, 1];
  let player = board.indexOf('@');
  const hall = player - player % stride;
  const room = cell => Math.floor((cell % stride - 1) / 7) + (cell < hall ? 0 : 2);
  let answer = '';

  rooms: for (let slot = 0; slot < 4; slot++) {
    let bit = 1, initial = 0, goals = 0;
    const floor = board.map((tile, cell) => {
      if (!' .$*@+'.includes(tile)) return 0;
      if (cell >= hall && cell < hall + stride) return 1;
      if (room(cell) !== slot) return 0;
      bit <<= 1;
      if ('$*'.includes(tile)) initial |= bit;
      if ('.*+'.includes(tile)) goals |= bit;
      return bit;
    });
    if (!initial) continue;

    const seen = new Set();
    let walks = [[player, initial, '']], pushes = [];
    while (walks.length || pushes.length) {
      if (!walks.length) {
        walks = pushes;
        pushes = [];
      }
      const [at, boxes, path] = walks.pop();
      const key = boxes * board.length + at;
      if (seen.has(key)) continue;
      seen.add(key);
      if (boxes === goals && floor[at] === 1) {
        answer += path;
        player = at;
        continue rooms;
      }
      for (const [direction, step] of steps.entries()) {
        const next = at + step;
        const tile = floor[next];
        if (!tile) continue;
        let layout = boxes;
        if (boxes & tile) {
          const target = floor[next + step];
          if (!target || target === 1 || (boxes & target)) continue;
          layout ^= tile | target;
        }
        const frontier = layout === boxes ? walks : pushes;
        frontier.push([next, layout, path + moves[direction]]);
      }
    }
    throw new Error('No solution for generated room');
  }
  return answer;
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of fs.readdirSync(I).sort()) {
  const folder = O + '/' + id;
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(folder + '/solution.txt', solve(fs.readFileSync(I + '/' + id + '/level.txt', 'utf8')));
}
