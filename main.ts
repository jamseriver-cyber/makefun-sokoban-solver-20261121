// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import fs from 'node:fs';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const moves = 'udlr';

function solveRoom(board, entrance, steps) {
  const cells = new Set([entrance]);
  let goals = 0, initial = 0, index = 0;
  for (const cell of cells) {
    const tile = board[cell];
    const bit = board[cell] = 1 << index++;
    if ('.*+'.includes(tile)) goals |= bit;
    if ('$*'.includes(tile)) initial |= bit;
    for (const step of steps) {
      if (' .$*@+'.includes(board[cell + step])) cells.add(cell + step);
    }
  }

  const pushes = [[entrance, initial, '']];
  const seen = new Set();
  for (const [entry, boxes, prefix] of pushes) {
    const walks = [[entry, prefix]];
    for (const [player, path] of walks) {
      const state = boxes * board.length + player;
      if (seen.has(state)) continue;
      seen.add(state);
      if (boxes === goals && player === entrance) return path;

      for (const [direction, step] of steps.entries()) {
        const next = player + step;
        const tile = board[next] | 0;
        if (!tile) continue;
        const route = path + moves[direction];
        if (!(boxes & tile)) {
          walks.push([next, route]);
        } else {
          const target = board[next + step] | 0;
          if (target && target !== 1 && !(boxes & target)) {
            pushes.push([next, boxes ^ tile ^ target, route]);
          }
        }
      }
    }
  }
  throw new Error('No solution for generated room');
}

function solve(level) {
  const board = level.replace(/\r/g, '').split('');
  const stride = board.indexOf('\n') + 1;
  let player = board.indexOf('@');
  const hall = player - player % stride;
  const steps = [-stride, stride, -1, 1];
  board.fill('#', hall, hall + stride);
  let path = '';
  for (let door = hall + 1; door < hall + stride - 2; door++) {
    if (board[door - stride] === '#' && board[door + stride] === '#') continue;
    board[door] = ' ';
    path += (door < player ? 'l' : 'r').repeat(Math.abs(door - player));
    path += solveRoom(board, door, steps);
    board[door] = '#';
    player = door;
  }
  return path;
}

for (const id of fs.readdirSync(I).sort()) {
  const folder = O + '/' + id;
  const level = fs.readFileSync(I + '/' + id + '/level.txt', 'utf8');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(folder + '/solution.txt', solve(level));
}
