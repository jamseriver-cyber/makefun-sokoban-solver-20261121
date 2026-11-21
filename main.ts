// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import fs from 'node:fs';

function solve(level) {
  const board = level.replace(/\r/g, '');
  const stride = board.indexOf('\n') + 1;
  const steps = Object.entries({ u: -stride, d: stride, l: -1, r: 1 });
  let player = board.indexOf('@');
  const hall = player - player % stride;
  const room = cell => Number(cell % stride > 7) + (cell < hall ? 0 : 2);
  let answer = '';

  rooms: for (let slot = 0; slot < 4; slot++) {
    let bit = 1, initial = 0, goals = 0;
    const floor = Array.from(board, (symbol, cell) => {
      const tile = ' .$*@+'.indexOf(symbol);
      if (tile < 0) return 0;
      if (cell >= hall && cell < hall + stride) return 1;
      if (room(cell) !== slot) return 0;
      bit <<= 1;
      if (tile & 2) initial |= bit;
      if (tile & 1) goals |= bit;
      return bit;
    });
    const seen = new Set();
    for (let queue = [[player, initial, '']]; queue.length;) {
      const pushes = [];
      while (queue.length) {
        const [at, boxes, path] = queue.pop();
        const key = boxes * board.length + at;
        if (seen.has(key)) continue;
        seen.add(key);
        if (boxes === goals && floor[at] === 1) {
          answer += path;
          player = at;
          continue rooms;
        }
        for (const [move, step] of steps) {
          const next = at + step;
          const tile = floor[next];
          if (!tile) continue;
          const route = path + move;
          if (boxes & tile) {
            const target = floor[next + step] & ~boxes & ~1;
            if (target) {
              pushes.push([next, boxes ^ tile ^ target, route]);
            }
          } else {
            queue.push([next, boxes, route]);
          }
        }
      }
      queue = pushes;
    }
    throw new Error('Unsolved room');
  }
  return answer;
}

const { MAKEFUN_INPUT_DIR: I = '/input', MAKEFUN_OUTPUT_DIR: O = '/output' } = process.env;
for (const id of fs.readdirSync(I).sort()) {
  const folder = O + '/' + id;
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(folder + '/solution.txt', solve(fs.readFileSync(I + '/' + id + '/level.txt', 'utf8')));
}
