const ROWS = 36;
const COLS = 56;

const patterns = {
  glider: {
    name: 'Glider',
    description: 'Ett litet mönster som förflyttar sig diagonalt. Tänk på det som en enkel signal.',
    cells: [[0,1],[1,2],[2,0],[2,1],[2,2]]
  },
  blinker: {
    name: 'Blinker',
    description: 'En oscillator som växlar mellan två tillstånd. Ett enkelt exempel på en periodisk signal.',
    cells: [[0,0],[0,1],[0,2]]
  },
  pulsar: {
    name: 'Pulsar',
    description: 'En större oscillator med period 3. Den visar hur komplexa cykler kan uppstå ur samma fyra regler.',
    cells: [
      [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
      [2,0],[3,0],[4,0],[2,5],[3,5],[4,5],[2,7],[3,7],[4,7],[2,12],[3,12],[4,12],
      [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
      [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
      [8,0],[9,0],[10,0],[8,5],[9,5],[10,5],[8,7],[9,7],[10,7],[8,12],[9,12],[10,12],
      [12,2],[12,3],[12,4],[12,8],[12,9],[12,10]
    ]
  },
  gun: {
    name: 'Gosper glider gun',
    description: 'En konstruktion som regelbundet skapar nya gliders. Den kan liknas vid en klock- eller signalgenerator.',
    cells: [
      [5,1],[5,2],[6,1],[6,2],
      [5,11],[6,11],[7,11],[4,12],[8,12],[3,13],[9,13],[3,14],[9,14],[6,15],[4,16],[8,16],[5,17],[6,17],[7,17],[6,18],
      [3,21],[4,21],[5,21],[3,22],[4,22],[5,22],[2,23],[6,23],[1,25],[2,25],[6,25],[7,25],
      [3,35],[4,35],[3,36],[4,36]
    ]
  }
};

const board = document.querySelector('#board');
const runBtn = document.querySelector('#runBtn');
const stepBtn = document.querySelector('#stepBtn');
const randomBtn = document.querySelector('#randomBtn');
const clearBtn = document.querySelector('#clearBtn');
const speedInput = document.querySelector('#speed');
const generationEl = document.querySelector('#generation');
const aliveEl = document.querySelector('#alive');
const patternButtons = document.querySelector('#patternButtons');
const patternTitle = document.querySelector('#patternTitle');
const patternDescription = document.querySelector('#patternDescription');

board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

let grid = createEmptyGrid();
let running = false;
let timer = null;
let generation = 0;
let drawing = false;
let drawValue = true;
let selectedPattern = 'glider';

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

function nextGeneration(current) {
  const next = createEmptyGrid();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && current[rr][cc]) neighbors++;
        }
      }
      next[r][c] = current[r][c] ? neighbors === 2 || neighbors === 3 : neighbors === 3;
    }
  }
  return next;
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.setAttribute('aria-label', `Rad ${r + 1}, kolumn ${c + 1}, död`);
      cell.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        drawing = true;
        drawValue = !grid[r][c];
        grid[r][c] = drawValue;
        renderCell(cell, r, c);
        updateStats();
      });
      cell.addEventListener('pointerenter', () => {
        if (!drawing) return;
        grid[r][c] = drawValue;
        renderCell(cell, r, c);
        updateStats();
      });
      fragment.appendChild(cell);
    }
  }
  board.appendChild(fragment);
}

function renderCell(cell, r, c) {
  cell.classList.toggle('alive', grid[r][c]);
  cell.setAttribute('aria-label', `Rad ${r + 1}, kolumn ${c + 1}, ${grid[r][c] ? 'levande' : 'död'}`);
}

function renderGrid() {
  const cells = board.children;
  let index = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      renderCell(cells[index], r, c);
      index++;
    }
  }
  updateStats();
}

function updateStats() {
  generationEl.textContent = generation;
  let alive = 0;
  for (const row of grid) for (const cell of row) if (cell) alive++;
  aliveEl.textContent = alive;
}

function step() {
  grid = nextGeneration(grid);
  generation++;
  renderGrid();
}

function getDelay() {
  return 540 - Number(speedInput.value);
}

function start() {
  if (timer) clearInterval(timer);
  running = true;
  runBtn.textContent = 'Pausa';
  stepBtn.disabled = true;
  timer = setInterval(step, getDelay());
}

function stop() {
  running = false;
  runBtn.textContent = 'Starta';
  stepBtn.disabled = false;
  if (timer) clearInterval(timer);
  timer = null;
}

function clearGrid() {
  stop();
  grid = createEmptyGrid();
  generation = 0;
  renderGrid();
}

function randomize() {
  stop();
  grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => Math.random() < 0.23));
  generation = 0;
  renderGrid();
}

function loadPattern(key) {
  stop();
  selectedPattern = key;
  const pattern = patterns[key];
  grid = createEmptyGrid();
  const maxR = Math.max(...pattern.cells.map(([r]) => r));
  const maxC = Math.max(...pattern.cells.map(([, c]) => c));
  const offR = Math.max(1, Math.floor((ROWS - maxR) / 2));
  const offC = key === 'gun' ? 3 : Math.max(1, Math.floor((COLS - maxC) / 2));
  for (const [r, c] of pattern.cells) {
    if (r + offR < ROWS && c + offC < COLS) grid[r + offR][c + offC] = true;
  }
  generation = 0;
  patternTitle.textContent = pattern.name;
  patternDescription.textContent = pattern.description;
  for (const button of patternButtons.children) {
    button.classList.toggle('selected', button.dataset.key === key);
  }
  renderGrid();
}

function buildPatternButtons() {
  for (const [key, pattern] of Object.entries(patterns)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = pattern.name;
    button.dataset.key = key;
    button.addEventListener('click', () => loadPattern(key));
    patternButtons.appendChild(button);
  }
}

runBtn.addEventListener('click', () => running ? stop() : start());
stepBtn.addEventListener('click', step);
randomBtn.addEventListener('click', randomize);
clearBtn.addEventListener('click', clearGrid);
speedInput.addEventListener('input', () => { if (running) start(); });
window.addEventListener('pointerup', () => { drawing = false; });
board.addEventListener('pointerleave', () => { drawing = false; });

buildBoard();
buildPatternButtons();
loadPattern(selectedPattern);
