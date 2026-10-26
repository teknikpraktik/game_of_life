const LAB_ROWS = 36;
const LAB_COLS = 56;

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
  },
  eater: {
    name: 'Eater',
    description: 'Ett stilla mönster som slukar en inkommande glider och sedan återställer sig självt. Fungerar som signalens slutpunkt.',
    cells: [[0,1],[1,2],[2,0],[2,1],[2,2],[7,7],[7,8],[8,7],[8,9],[9,9],[10,9],[10,10]]
  }
};

const $ = (selector) => document.querySelector(selector);
const board = $('#board');
const viewport = $('#viewport');
const layer = $('#layer');
const labelsEl = $('#labels');
const runBtn = $('#runBtn');
const stepBtn = $('#stepBtn');
const randomBtn = $('#randomBtn');
const clearBtn = $('#clearBtn');
const resetBtn = $('#resetBtn');
const speedInput = $('#speed');
const generationEl = $('#generation');
const aliveEl = $('#alive');
const patternButtons = $('#patternButtons');
const patternTitle = $('#patternTitle');
const patternDescription = $('#patternDescription');
const drawModeBtn = $('#drawModeBtn');
const panModeBtn = $('#panModeBtn');
const zoomLevelEl = $('#zoomLevel');

let rows = 0;
let cols = 0;
let grid = [];
let shown = new Uint8Array(0);
let marks = [];
let running = false;
let timer = null;
let generation = 0;
let selectedPattern = 'glider';
let currentView = 'lab';
let scene = null;

function createEmptyGrid(r = rows, c = cols) {
  return Array.from({ length: r }, () => Array(c).fill(false));
}

// Conways regler, oförändrade. Utanför rutnätet räknas alla celler som döda.
function nextGeneration(current) {
  const R = current.length;
  const C = current[0].length;
  const next = Array.from({ length: R }, () => Array(C).fill(false));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < R && cc >= 0 && cc < C && current[rr][cc]) neighbors++;
        }
      }
      next[r][c] = current[r][c] ? neighbors === 2 || neighbors === 3 : neighbors === 3;
    }
  }
  return next;
}

/* ---------- Rutnät och rendering ---------- */

function setBoardSize(r, c) {
  if (r === rows && c === cols) return;
  rows = r;
  cols = c;
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  viewport.style.aspectRatio = `${cols} / ${rows}`;
  // Höga rutnät begränsas till 75 % av fönsterhöjden så att bräde och avläsning syns samtidigt.
  viewport.style.width = `min(100%, ${(75 * cols / rows).toFixed(2)}vh)`;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < rows * cols; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    fragment.appendChild(cell);
  }
  board.replaceChildren(fragment);
  shown = new Uint8Array(rows * cols);
  marks = Array(rows * cols).fill('');
  resetView();
}

function setMarks(newMarks) {
  marks = newMarks || Array(rows * cols).fill('');
  const cells = board.children;
  for (let i = 0; i < cells.length; i++) {
    cells[i].className = 'cell' + (marks[i] ? ' ' + marks[i] : '') + (shown[i] ? ' alive' : '');
  }
}

function renderGrid() {
  const cells = board.children;
  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alive = grid[r][c] ? 1 : 0;
      if (shown[index] !== alive) {
        shown[index] = alive;
        cells[index].classList.toggle('alive', alive === 1);
      }
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
  board.setAttribute('aria-label', `Game of Life-rutnät, ${rows} × ${cols} celler, generation ${generation}, ${alive} levande`);
}

function step() {
  grid = nextGeneration(grid);
  generation++;
  renderGrid();
  if (scene) onSceneGeneration();
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
  grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.random() < 0.23));
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
  const offR = Math.max(1, Math.floor((rows - maxR) / 2));
  const offC = key === 'gun' ? 3 : Math.max(1, Math.floor((cols - maxC) / 2));
  for (const [r, c] of pattern.cells) {
    if (r + offR < rows && c + offC < cols) grid[r + offR][c + offC] = true;
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

/* ---------- Zoom, panorering och ritande ---------- */

const zoom = { s: 1, x: 0, y: 0 };
let panMode = false;
const pointers = new Map();
let gesture = null;

function maxScale() {
  return Math.max(4, 36 / (viewport.clientWidth / cols || 1));
}

function applyView() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  zoom.s = Math.min(Math.max(zoom.s, 1), maxScale());
  zoom.x = Math.min(0, Math.max(w - w * zoom.s, zoom.x));
  zoom.y = Math.min(0, Math.max(h - h * zoom.s, zoom.y));
  layer.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
  layer.style.setProperty('--inv', 1 / zoom.s);
  zoomLevelEl.textContent = `${Math.round(zoom.s * 100)} %`;
}

function resetView() {
  zoom.s = 1;
  zoom.x = 0;
  zoom.y = 0;
  applyView();
}

// Zooma kring en punkt (px relativt viewport) så att den punkten ligger still.
function zoomAt(scale, px, py) {
  const s = Math.min(Math.max(scale, 1), maxScale());
  zoom.x = px - (px - zoom.x) * (s / zoom.s);
  zoom.y = py - (py - zoom.y) * (s / zoom.s);
  zoom.s = s;
  applyView();
}

function zoomCenter(factor) {
  zoomAt(zoom.s * factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

function setPanMode(on) {
  panMode = on;
  drawModeBtn.setAttribute('aria-pressed', String(!on));
  panModeBtn.setAttribute('aria-pressed', String(on));
  viewport.classList.toggle('pan', on);
}

function cellAt(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  const c = Math.floor((clientX - rect.left) / rect.width * cols);
  const r = Math.floor((clientY - rect.top) / rect.height * rows);
  return r >= 0 && r < rows && c >= 0 && c < cols ? [r, c] : null;
}

function paintCell(r, c) {
  if (grid[r][c] === gesture.value) return;
  gesture.changes.push([r, c, grid[r][c]]);
  grid[r][c] = gesture.value;
}

function paintTo(clientX, clientY) {
  const target = cellAt(clientX, clientY);
  if (!target) return;
  const [r1, c1] = target;
  const [r0, c0] = gesture.last || target;
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 1 : i / n;
    paintCell(Math.round(r0 + (r1 - r0) * t), Math.round(c0 + (c1 - c0) * t));
  }
  gesture.last = target;
  renderGrid();
}

function localPoint(p) {
  const rect = viewport.getBoundingClientRect();
  return [p.x - rect.left, p.y - rect.top];
}

function startPinch() {
  if (gesture && gesture.type === 'draw') {
    for (const [r, c, value] of gesture.changes.reverse()) grid[r][c] = value;
    renderGrid();
  }
  const [a, b] = [...pointers.values()];
  const [ax, ay] = localPoint(a);
  const [bx, by] = localPoint(b);
  gesture = { type: 'pinch', dist: Math.hypot(ax - bx, ay - by) || 1, cx: (ax + bx) / 2, cy: (ay + by) / 2, s: zoom.s, x: zoom.x, y: zoom.y };
}

viewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.button !== 1) return;
  event.preventDefault();
  try { viewport.setPointerCapture(event.pointerId); } catch { /* pekaren är redan släppt */ }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    startPinch();
  } else if (pointers.size === 1) {
    if (panMode || event.button === 1) {
      gesture = { type: 'pan', px: event.clientX, py: event.clientY, x: zoom.x, y: zoom.y };
    } else {
      const target = cellAt(event.clientX, event.clientY);
      if (!target) return;
      gesture = { type: 'draw', value: !grid[target[0]][target[1]], changes: [], last: null };
      paintTo(event.clientX, event.clientY);
    }
  }
});

viewport.addEventListener('pointermove', (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!gesture) return;
  if (gesture.type === 'draw') {
    paintTo(event.clientX, event.clientY);
  } else if (gesture.type === 'pan') {
    zoom.x = gesture.x + event.clientX - gesture.px;
    zoom.y = gesture.y + event.clientY - gesture.py;
    applyView();
  } else if (gesture.type === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const [ax, ay] = localPoint(a);
    const [bx, by] = localPoint(b);
    const s = Math.min(Math.max(gesture.s * Math.hypot(ax - bx, ay - by) / gesture.dist, 1), maxScale());
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    zoom.x = cx - (gesture.cx - gesture.x) * (s / gesture.s);
    zoom.y = cy - (gesture.cy - gesture.y) * (s / gesture.s);
    zoom.s = s;
    applyView();
  }
});

function endPointer(event) {
  if (!pointers.delete(event.pointerId)) return;
  // Efter en nypning ignoreras det kvarvarande fingret tills alla släppt.
  if (pointers.size === 0 || (gesture && gesture.type !== 'pinch')) gesture = null;
}
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);

viewport.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  zoomAt(zoom.s * Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });

drawModeBtn.addEventListener('click', () => setPanMode(false));
panModeBtn.addEventListener('click', () => setPanMode(true));
$('#zoomInBtn').addEventListener('click', () => zoomCenter(1.5));
$('#zoomOutBtn').addEventListener('click', () => zoomCenter(1 / 1.5));
$('#zoomFitBtn').addEventListener('click', resetView);
window.addEventListener('resize', applyView);

/* ---------- Byggstenar: riktiga Life-mönster ---------- */

const SE = [1, 1];
const SW = [1, -1];
const NE = [-1, 1];

// Gliderns fyra faser när den färdas åt sydost. Andra riktningar fås genom spegling.
const GLIDER_PHASES = [
  [[0,1],[1,2],[2,0],[2,1],[2,2]],
  [[0,0],[0,2],[1,1],[1,2],[2,1]],
  [[0,2],[1,0],[1,2],[2,1],[2,2]],
  [[0,0],[1,1],[1,2],[2,0],[2,1]]
];
// Eater 1 (fishhook) orienterad mot en glider som kommer från nordväst.
const EATER = [[0,0],[0,1],[1,0],[1,2],[2,2],[3,2],[3,3]];

// En glider anges med riktning och övre vänstra hörnet av sin 3×3-ruta.
function gliderCells(g) {
  return GLIDER_PHASES[g.phase || 0].map(([r, c]) => [
    g.r + (g.dir[0] < 0 ? 2 - r : r),
    g.c + (g.dir[1] < 0 ? 2 - c : c)
  ]);
}

// Gliderns ruta efter n steg (ett steg = 4 generationer, en ruta diagonalt).
function ahead(g, n) {
  return { r: g.r + n * g.dir[0], c: g.c + n * g.dir[1] };
}

// Eater som slukar glidern efter att den färdats n steg.
function eaterCells(g, n) {
  const at = ahead(g, n);
  const r0 = at.r + (g.dir[0] > 0 ? 5 : -6);
  const c0 = at.c + (g.dir[1] > 0 ? 5 : -6);
  return EATER.map(([r, c]) => [r0 + (g.dir[0] < 0 ? 3 - r : r), c0 + (g.dir[1] < 0 ? 3 - c : c)]);
}

// Förintande kollision. När en sydostgående glider har sin ruta på (r, c) och en
// sydvästgående glider samtidigt har sin på (r - 1, c + 6) försvinner båda helt.
// Speglat i diagonalen gäller samma sak för en nordostgående glider på (r + 6, c - 1).
// Positionerna togs fram med en uttömmande sökning och verifieras av sanningstabellerna.
const ANNIHILATE = { SW: [-1, 6], NE: [6, -1] };

// Glider i riktning dir som möter glidern target efter exakt n steg och förintar den.
function crossing(target, n, dir, extra = {}) {
  const offset = dir === SW ? ANNIHILATE.SW : ANNIHILATE.NE;
  const at = ahead(target, n);
  return { dir, r: at.r + offset[0] - n * dir[0], c: at.c + offset[1] - n * dir[1], ...extra };
}

/* ---------- Lektionen: från glider till logik ---------- */

const ROLE_TEXT = { a: 'A', b: 'B', clk: 'klocka', out: 'utgång', sig: 'signal' };

const GATES = {
  NOT: { name: 'NOT', inputs: ['A'], fn: (a) => !a, formula: 'UT = INTE A' },
  AND: { name: 'AND', inputs: ['A', 'B'], fn: (a, b) => a && b, formula: 'UT = A OCH B' },
  OR: { name: 'OR', inputs: ['A', 'B'], fn: (a, b) => a || b, formula: 'UT = A ELLER B' },
  NOR: { name: 'NOR', inputs: ['A', 'B'], fn: (a, b) => !(a || b), formula: 'UT = INTE (A ELLER B)' }
};

const lesson = {
  step: 0,
  variant: 'exact',
  inputs: { A: true, B: true },
  bits: [1, 0, 1, 1],
  gate: 'AND',
  table: {},
  slotTimes: null,
  latch: false,
  counter: 0
};

// Varje scen beskriver ett startmönster: gliders, eaters, mottagare (detektorer) och etiketter.
// Banor, mottagare och etiketter är bara markeringar – de påverkar inte simuleringen.
function signalScene() {
  const g = { id: 'sig', role: 'sig', dir: SE, r: 3, c: 3, lane: 24 };
  return {
    rows: 36, cols: 48, endGen: 108,
    gliders: [g],
    eaters: [eaterCells(g, 24)],
    detectors: [{ id: 'rx', ...ahead(g, 18) }],
    labels: [
      { r: 2, c: 11, text: 'sändare', role: 'sig' },
      { r: 21, c: 31, text: 'mottagare', role: 'out' },
      { r: 30, c: 40, text: 'eater', role: 'eat' }
    ]
  };
}

function collisionScene() {
  const g1 = { id: 'g1', role: 'a', dir: SE, r: 4, c: 4, lane: 13 };
  const g2 = crossing(g1, 12, SW, { id: 'g2', role: 'b', lane: 13 });
  if (lesson.variant === 'off') g2.r += 1;
  return {
    rows: 36, cols: 56, endGen: 88,
    gliders: [g1, g2],
    eaters: [],
    detectors: [],
    labels: [
      { r: 2, c: 13, text: 'glider 1', role: 'a' },
      { r: 1, c: 44, text: 'glider 2', role: 'b' },
      { r: 25, c: 21, text: 'kollisionspunkt', role: 'muted' }
    ]
  };
}

function inputsScene() {
  const a = { id: 'A', input: 'A', role: 'a', dir: SE, r: 2, c: 2, lane: 24 };
  const b = { id: 'B', input: 'B', role: 'b', dir: SE, r: 2, c: 18, lane: 24 };
  return {
    rows: 36, cols: 56, endGen: 108,
    gliders: [a, b],
    eaters: [eaterCells(a, 24), eaterCells(b, 24)],
    detectors: [{ id: 'A', ...ahead(a, 18) }, { id: 'B', ...ahead(b, 18) }],
    labels: [
      { r: 3, c: 9, text: 'ingång A', role: 'a' },
      { r: 3, c: 25, text: 'ingång B', role: 'b' },
      { r: 21, c: 13, text: 'mottagare A', role: 'out' },
      { r: 21, c: 29, text: 'mottagare B', role: 'out' }
    ]
  };
}

function bitsScene() {
  // Fyra möjliga gliders i samma bana, 6 rutor (24 generationer) isär. Den främsta kommer fram först.
  const gliders = [];
  const labels = [];
  for (let i = 0; i < 4; i++) {
    const k = 3 - i;
    const g = { id: `bit${i}`, bit: i, role: 'sig', dir: SE, r: 2 + 6 * k, c: 8 + 6 * k, lane: 4 + 6 * i + 3 };
    gliders.push(g);
    labels.push({ r: g.r + 1, c: g.c - 4, text: `bit ${i + 1}`, role: 'sig' });
  }
  const lead = gliders[0];
  labels.push({ r: 24, c: 38, text: 'mottagare', role: 'out' }, { r: 31, c: 45, text: 'eater', role: 'eat' });
  return {
    rows: 36, cols: 48, endGen: 112,
    gliders,
    eaters: [eaterCells(lead, 7)],
    detectors: [{ id: 'rx', ...ahead(lead, 4) }],
    labels
  };
}

function gateScene(gateKey) {
  const K1 = 10;
  const K2 = 18;
  const K3 = 26;
  const C = { id: 'C', role: 'clk', dir: SE, r: 2, c: 2, lane: 40 };
  const gliders = [C];
  const eaters = [];
  const labels = [{ r: 1, c: 9, text: 'klocka C = 1', role: 'clk' }];
  let out;

  if (gateKey === 'NOT') {
    const A = crossing(C, K1, SW, { id: 'A', input: 'A', role: 'a', lane: K1 + 1 });
    gliders.push(A);
    eaters.push(eaterCells(C, 40));
    out = ahead(C, 32);
    labels.push({ r: 2, c: A.c + 7, text: 'A', role: 'a' });
  } else if (gateKey === 'NOR' || gateKey === 'OR') {
    const A = crossing(C, K1, SW, { id: 'A', input: 'A', role: 'a', lane: K1 + 1 });
    const B = crossing(C, K2, NE, { id: 'B', input: 'B', role: 'b', lane: 36 });
    gliders.push(A, B);
    eaters.push(eaterCells(B, 36));
    labels.push({ r: 2, c: A.c + 7, text: 'A', role: 'a' }, { r: B.r - 1, c: B.c + 6, text: 'B', role: 'b' });
    if (gateKey === 'NOR') {
      C.lane = 40;
      eaters.push(eaterCells(C, 40));
      out = ahead(C, 32);
    } else {
      C.lane = K3 + 1;
      const D = crossing(C, K3, SW, { id: 'D', role: 'clk', lane: 40 });
      gliders.push(D);
      eaters.push(eaterCells(D, 40));
      out = ahead(D, 34);
      labels.push({ r: 1, c: D.c - 8, text: 'klocka D = 1', role: 'clk' });
    }
  } else {
    // AND: B förintar klockan C; om B saknas förintar C i stället A.
    const B = crossing(C, K1, NE, { id: 'B', input: 'B', role: 'b', lane: K1 + 1 });
    const A = crossing(C, K2, SW, { id: 'A', input: 'A', role: 'a', lane: 32 });
    gliders.push(A, B);
    eaters.push(eaterCells(C, 40), eaterCells(A, 32));
    out = ahead(A, 26);
    labels.push({ r: 2, c: A.c + 7, text: 'A', role: 'a' }, { r: B.r - 1, c: B.c + 6, text: 'B', role: 'b' });
  }
  labels.push({ r: out.r + 1, c: out.c + (gateKey === 'AND' || gateKey === 'OR' ? -5 : 7), text: 'UT', role: 'out' });
  return {
    rows: 52, cols: 66, endGen: 176,
    gliders, eaters,
    detectors: [{ id: 'out', ...out }],
    labels
  };
}

const steps = [
  {
    short: 'Signal',
    title: 'En glider är en signal',
    kind: 'sim',
    scene: signalScene,
    text: `
      <p>En glider är fem levande celler som var fjärde generation återskapar sin egen form – förflyttad en ruta diagonalt. Ingen cell rör sig; det är <b>mönstret</b> som vandrar.</p>
      <p>Därför kan en glider bära information från en plats till en annan, ungefär som en puls i en ledning.</p>
      <p><b>Prova:</b> tryck Starta och följ glidern längs banan till den gröna mottagaren. Längst bort väntar en <i>eater</i>: ett stilla mönster som slukar glidern och återställer sig självt, så att signalen inte blir skräp vid kanten.</p>
      <p class="note">Farten är exakt 1 ruta per 4 generationer. Avståndet bestämmer alltså precis <i>när</i> signalen kommer fram – det blir avgörande för logiken.</p>`
  },
  {
    short: 'Kollision',
    title: 'Två gliders kolliderar',
    kind: 'sim',
    scene: collisionScene,
    text: `
      <p>När två gliders möts avgörs resultatet helt av deras inbördes position och fas. Vissa kollisioner förintar båda fullständigt, andra lämnar skräp efter sig.</p>
      <p><b>Exakt timing:</b> båda glidrarna försvinner utan spår. Det är byggstenen i alla grindar längre fram.</p>
      <p><b>En ruta fel:</b> glider 2 startar en enda ruta längre ner. Nu blir resultatet två <i>block</i> – stilla skräp som skulle förstöra nästa signal på samma bana.</p>
      <p class="note">Ingen regel har ändrats mellan varianterna. Skillnaden ligger bara i startmönstret.</p>`
  },
  {
    short: 'Ingångar',
    title: 'Ingång A och ingång B',
    kind: 'sim',
    scene: inputsScene,
    text: `
      <p>En krets behöver ingångar. Här finns två banor. <b>Ingång A</b> och <b>ingång B</b> är var sin plats i startmönstret där en glider antingen finns eller saknas.</p>
      <p>Det är alltså startmönstret – inte reglerna – som anger vilka ingångar som är aktiva.</p>
      <p><b>Prova:</b> slå av och på A och B under rutnätet och kör. Banorna är parallella, så signalerna påverkar inte varandra – ännu.</p>`
  },
  {
    short: '1 och 0',
    title: 'Glider = 1, ingen glider = 0',
    kind: 'sim',
    scene: bitsScene,
    text: `
      <p>Binär information kräver två tydligt skilda tillstånd. I Life används närvaro: <b>en glider som anländer betyder 1</b>, <b>en tom plats i strömmen betyder 0</b>.</p>
      <p>Men ”ingen glider” betyder bara något om man vet <i>när</i> man ska titta. Signalerna går därför i takt: här kan en glider komma var 24:e generation, och mottagaren läser av ett tidsfönster i taget. Fyra fönster ger fyra bitar – ett tal.</p>
      <p><b>Prova:</b> välj bitar, kör och se talet byggas upp när glidrarna når mottagaren.</p>
      <p class="note">Fullskaliga Life-datorer gör likadant. En glidervapen fungerar som klocka och ger en ny tidslucka med jämna mellanrum.</p>`
  },
  {
    short: 'Grindar',
    title: 'Logiska grindar av kollisioner',
    kind: 'sim',
    scene: () => gateScene(lesson.gate),
    text: () => `
      <p><b>Tricket:</b> en klockglider C finns alltid (logisk 1). En indataglider som korsar C:s bana med exakt rätt timing förintar båda – kollisionen från steg 2. Det som fortsätter förbi korsningen är därför <i>C och inte A</i>.</p>
      ${{
        NOT: '<p><b>NOT:</b> C når utgången bara om A saknas. Utgången blir INTE A.</p>',
        AND: '<p><b>AND:</b> här är utgången A:s egen bana. B förintar först klockan C. Saknas B lever C vidare och förintar A vid nästa korsning. A kommer alltså bara fram om B också fanns: A OCH B.</p>',
        OR: '<p><b>OR:</b> först byggs en NOR (se den grinden). Dess utgång C korsar sedan en andra klockglider D. D kommer bara fram när C har försvunnit, det vill säga när A eller B var 1. Två negationer i rad ger A ELLER B.</p>',
        NOR: '<p><b>NOR:</b> C måste klara två korsningar. A kan förinta den vid den första, B vid den andra. C når utgången bara om både A och B saknas: INTE (A ELLER B). NOR är <i>universell</i> – alla andra grindar kan byggas av enbart NOR.</p>'
      }[lesson.gate]}
      <p class="note"><b>Detta är verklig simulering.</b> Förenkling: varje klocksignal är här en enda glider, alltså en enda tidslucka. I fullskaliga konstruktioner kommer klockan från glidervapen, och signaler som ska svänga eller förgrenas behöver reflektorer – större mönster som bygger på samma princip.</p>`
  },
  {
    short: 'Dator',
    title: 'Från grindar till dator',
    kind: 'schema',
    text: `
      <p>Här lämnar vi rutnätet. Stegen nedan är en <b>schematisk förklaring</b> av hur grindarna du just sett kan kombineras. Den simuleras inte cell för cell.</p>
      <p>Logiken är densamma som i en vanlig dator. Skillnaden är bara vad som bär signalen: elektroner i kisel eller gliders i ett rutnät.</p>
      <p class="note">Att detta fungerar i princip visades redan 1982 av Berlekamp, Conway och Guy i <i>Winning Ways</i>: Life är beräkningsuniversellt. Paul Rendell byggde en fungerande Turingmaskin i Life år 2000, och projektet ”Quest for Tetris” byggde senare en programmerbar dator som kör Tetris.</p>`
  }
];

const stepNav = $('#stepNav');
const lessonPanel = $('#lessonPanel');
const schematic = $('#schematic');
let detectorState = [];

function buildStepNav() {
  steps.forEach((s, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.step = i;
    button.innerHTML = `<span>${i + 1}</span>${s.short}`;
    button.addEventListener('click', () => showStep(i));
    stepNav.appendChild(button);
  });
}

function buildScene() {
  const def = steps[lesson.step].scene();
  const included = def.gliders.filter((g) => isGliderOn(g));
  def.cells = [...included.flatMap(gliderCells), ...def.eaters.flat()];
  return def;
}

function isGliderOn(g) {
  if (g.input) return lesson.inputs[g.input];
  if (g.bit !== undefined) return lesson.bits[g.bit] === 1;
  return true;
}

function detectorBox(d) {
  return { r0: d.r - 1, c0: d.c - 1, r1: d.r + 3, c1: d.c + 3 };
}

function sceneMarks(def) {
  const m = Array(def.rows * def.cols).fill('');
  const put = (r, c, cls) => {
    if (r >= 0 && r < def.rows && c >= 0 && c < def.cols) m[r * def.cols + c] = cls;
  };
  for (const g of def.gliders) {
    for (let n = 0; n <= g.lane; n++) {
      const at = ahead(g, n);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) put(at.r + r, at.c + c, `lane lane-${g.role}`);
    }
  }
  for (const d of def.detectors) {
    const b = detectorBox(d);
    for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) put(r, c, 'det');
  }
  return m;
}

function loadScene() {
  stop();
  scene = buildScene();
  setBoardSize(scene.rows, scene.cols);
  grid = createEmptyGrid();
  for (const [r, c] of scene.cells) grid[r][c] = true;
  generation = 0;
  detectorState = scene.detectors.map(() => ({ present: false, hits: [] }));
  setMarks(sceneMarks(scene));
  renderGrid();
  renderLabels();
  resetView();
  renderLessonPanel();
}

function renderLabels() {
  labelsEl.replaceChildren(...scene.labels.map((l) => {
    const el = document.createElement('span');
    el.className = `board-label label-${l.role}`;
    el.textContent = l.text;
    el.style.left = `${((l.c + 0.5) / scene.cols) * 100}%`;
    el.style.top = `${((l.r + 0.5) / scene.rows) * 100}%`;
    return el;
  }));
}

function readDetectors(g, defs, state, gen) {
  defs.forEach((d, i) => {
    const b = detectorBox(d);
    let count = 0;
    for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) if (g[r][c]) count++;
    // En hel glider (5 celler) i mottagaren räknas som en träff. Då ger kanten inga dubbelträffar.
    const present = count >= 5;
    if (present && !state[i].present) state[i].hits.push(gen);
    state[i].present = present;
  });
}

// Kör en scen utan att rita den, med samma regler som rutnätet. Används för sanningstabeller.
function simulateScene(def) {
  let g = createEmptyGrid(def.rows, def.cols);
  for (const [r, c] of def.cells) g[r][c] = true;
  const state = def.detectors.map(() => ({ present: false, hits: [] }));
  for (let gen = 1; gen <= def.endGen; gen++) {
    g = nextGeneration(g);
    readDetectors(g, def.detectors, state, gen);
  }
  let alive = 0;
  for (const row of g) for (const cell of row) if (cell) alive++;
  return { state, alive };
}

function onSceneGeneration() {
  readDetectors(grid, scene.detectors, detectorState, generation);
  const cells = board.children;
  scene.detectors.forEach((d, i) => {
    const b = detectorBox(d);
    const hit = detectorState[i].hits.length > 0;
    for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) cells[r * cols + c].classList.toggle('det-hit', hit);
  });
  if (generation === scene.endGen) {
    stop();
    recordResult();
  }
  renderReadout();
}

function finished() {
  return generation >= scene.endGen;
}

function gateValue(i = 0) {
  return detectorState[i].hits.length > 0;
}

function comboKey() {
  return GATES[lesson.gate].inputs.map((k) => (lesson.inputs[k] ? 1 : 0)).join('');
}

function recordResult() {
  if (lesson.step !== 4) return;
  (lesson.table[lesson.gate] ||= {})[comboKey()] = gateValue() ? 1 : 0;
  renderTruthTable();
}

function slotTimes() {
  if (lesson.slotTimes) return lesson.slotTimes;
  const saved = lesson.bits;
  lesson.bits = [1, 1, 1, 1];
  lesson.slotTimes = simulateScene(buildScene()).state[0].hits;
  lesson.bits = saved;
  return lesson.slotTimes;
}

function decodeBits(hits) {
  return slotTimes().map((t) => {
    if (hits.some((h) => Math.abs(h - t) <= 4)) return '1';
    return generation >= t + 4 ? '0' : '·';
  });
}

const bitText = (on) => (on ? '1' : '0');

function renderReadout() {
  const el = $('#readout');
  if (!el) return;
  const s = lesson.step;
  const progress = finished() ? 'Klart' : `Generation ${generation} av ${scene.endGen}`;
  let html = '';
  if (s === 0) {
    const hits = detectorState[0].hits;
    html = hits.length
      ? `<b class="ok">Signal mottagen</b> i generation ${hits[0]}.`
      : finished() ? 'Ingen signal mottogs.' : 'Mottagaren väntar på signalen …';
  } else if (s === 1) {
    let alive = 0;
    for (const row of grid) for (const cell of row) if (cell) alive++;
    html = finished()
      ? alive === 0
        ? '<b class="ok">Båda glidrarna förintades.</b> 0 levande celler kvar.'
        : `<b class="warn">Skräp kvar:</b> ${alive} levande celler i stilla block.`
      : `Levande celler: ${alive}`;
  } else if (s === 2) {
    html = ['A', 'B'].map((k, i) => {
      const hit = detectorState[i].hits.length > 0;
      const value = hit ? '1' : finished() ? '0' : '…';
      return `Mottagare ${k}: <b class="${hit ? 'ok' : ''}">${value}</b>`;
    }).join(' &nbsp; · &nbsp; ');
  } else if (s === 3) {
    const bits = decodeBits(detectorState[0].hits);
    const value = parseInt(bits.join(''), 2);
    html = `Mottaget: <b class="mono">${bits.join(' ')}</b>${bits.includes('·') ? '' : ` &nbsp;=&nbsp; <b>${value}</b> decimalt`}`;
  } else if (s === 4) {
    const gate = GATES[lesson.gate];
    const ins = gate.inputs.map((k) => `${k} = ${bitText(lesson.inputs[k])}`).join(', ');
    const hit = gateValue();
    const value = hit ? '<b class="ok">1</b> (glider anlände)' : finished() ? '<b>0</b> (ingen glider)' : '… väntar';
    html = `${ins} &nbsp;→&nbsp; UT = ${value}`;
  }
  el.innerHTML = `<span>${html}</span><span class="progress">${progress}</span>`;
}

function toggleButton(label, on, attrs) {
  return `<button type="button" class="toggle${on ? ' on' : ''}" aria-pressed="${on}" ${attrs}>${label} = ${bitText(on)}</button>`;
}

function renderTruthTable() {
  const el = $('#truthTable');
  if (!el) return;
  const gate = GATES[lesson.gate];
  const results = lesson.table[lesson.gate] || {};
  const combos = gate.inputs.length === 1 ? ['0', '1'] : ['00', '01', '10', '11'];
  const current = comboKey();
  el.innerHTML = `
    <table>
      <caption>Sanningstabell för ${gate.name}: ${gate.formula}</caption>
      <thead><tr>${gate.inputs.map((k) => `<th scope="col">${k}</th>`).join('')}<th scope="col">Förväntat</th><th scope="col">Simulerat</th></tr></thead>
      <tbody>${combos.map((combo) => {
        const values = combo.split('').map(Number);
        const expected = gate.fn(...values.map(Boolean)) ? 1 : 0;
        const got = results[combo];
        const cls = got === undefined ? '' : got === expected ? 'ok' : 'bad';
        return `<tr class="${combo === current ? 'current' : ''}">${values.map((v) => `<td>${v}</td>`).join('')}<td>${expected}</td><td class="${cls}">${got === undefined ? '–' : got}</td></tr>`;
      }).join('')}</tbody>
    </table>`;
}

function testAllCombos() {
  const gate = GATES[lesson.gate];
  const saved = { ...lesson.inputs };
  const results = (lesson.table[lesson.gate] = {});
  const combos = gate.inputs.length === 1 ? ['0', '1'] : ['00', '01', '10', '11'];
  for (const combo of combos) {
    gate.inputs.forEach((k, i) => { lesson.inputs[k] = combo[i] === '1'; });
    results[combo] = simulateScene(buildScene()).state[0].hits.length > 0 ? 1 : 0;
  }
  lesson.inputs = saved;
  renderTruthTable();
}

function renderLessonPanel() {
  const s = lesson.step;
  let html = '';
  if (s === 1) {
    html = `<div class="option-row" role="group" aria-label="Timing">
      <button type="button" class="choice${lesson.variant === 'exact' ? ' selected' : ''}" data-action="variant" data-value="exact">Exakt timing</button>
      <button type="button" class="choice${lesson.variant === 'off' ? ' selected' : ''}" data-action="variant" data-value="off">En ruta fel</button>
    </div>`;
  } else if (s === 2) {
    html = `<div class="option-row" role="group" aria-label="Ingångar">
      ${toggleButton('A', lesson.inputs.A, 'data-action="input" data-value="A"')}
      ${toggleButton('B', lesson.inputs.B, 'data-action="input" data-value="B"')}
    </div>`;
  } else if (s === 3) {
    html = `<div class="option-row" role="group" aria-label="Bitar">
      ${lesson.bits.map((b, i) => toggleButton(`bit ${i + 1}`, b === 1, `data-action="bit" data-value="${i}"`)).join('')}
    </div>`;
  } else if (s === 4) {
    const gate = GATES[lesson.gate];
    html = `<div class="option-row" role="group" aria-label="Grind">
      ${Object.keys(GATES).map((k) => `<button type="button" class="choice${k === lesson.gate ? ' selected' : ''}" data-action="gate" data-value="${k}">${k}</button>`).join('')}
    </div>
    <div class="option-row" role="group" aria-label="Ingångar">
      ${gate.inputs.map((k) => toggleButton(k, lesson.inputs[k], `data-action="input" data-value="${k}"`)).join('')}
      <button type="button" class="choice" data-action="testAll">Testa hela tabellen</button>
    </div>`;
  }
  const legend = scene ? legendHtml() : '';
  lessonPanel.innerHTML = `${html}<p id="readout" class="readout" aria-live="polite"></p>${s === 4 ? '<div id="truthTable" class="truth-table"></div>' : ''}${legend}`;
  renderReadout();
  renderTruthTable();
}

function legendHtml() {
  const roles = [...new Set(scene.gliders.map((g) => g.role))];
  const items = roles.map((r) => `<span><i class="sw lane-${r}"></i>bana: ${ROLE_TEXT[r]}</span>`);
  if (scene.detectors.length) items.push('<span><i class="sw det"></i>mottagare</span>');
  return `<p class="legend">${items.join('')}</p>`;
}

lessonPanel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, value } = button.dataset;
  if (action === 'variant') lesson.variant = value;
  if (action === 'input') lesson.inputs[value] = !lesson.inputs[value];
  if (action === 'bit') lesson.bits[value] = lesson.bits[value] ? 0 : 1;
  if (action === 'gate') lesson.gate = value;
  if (action === 'testAll') {
    testAllCombos();
    return;
  }
  loadScene();
  if (action === 'gate') renderLessonText();
  const again = lessonPanel.querySelector(`[data-action="${action}"][data-value="${value}"]`);
  if (again) again.focus();
});

/* ---------- Steg 6: schematisk förklaring ---------- */

function renderSchematic() {
  const q = lesson.latch;
  const n = lesson.counter;
  const bits = [4, 2, 1].map((w) => ((n & w) ? 1 : 0));
  schematic.innerHTML = `
    <p class="badge schema">Schematisk förklaring – simuleras inte i rutnätet</p>
    <ol class="ladder">
      <li>
        <h3>1. Grindar kombineras</h3>
        <p>Med NOR (som du kört i steg 5) kan alla andra grindar byggas:</p>
        <ul class="formulas">
          <li><code>INTE A</code> = NOR(A, A)</li>
          <li><code>A ELLER B</code> = INTE NOR(A, B)</li>
          <li><code>A OCH B</code> = NOR(INTE A, INTE B)</li>
        </ul>
        <p>Två sådana grindar ger en <b>halvadderare</b>: summan är XOR, minnessiffran är AND. Kedjor av adderare kan räkna med tal av valfri längd.</p>
      </li>
      <li>
        <h3>2. Återkoppling ger minne</h3>
        <p>Koppla två NOR-grindar så att varandras utgångar går tillbaka in som ingångar. Då håller kretsen kvar sitt värde även när ingångarna är 0 – en <b>SR-vippa</b>, en bit minne.</p>
        <div class="mini" role="group" aria-label="SR-vippa">
          <button type="button" data-action="set">Set (S)</button>
          <button type="button" data-action="reset">Reset (R)</button>
          <span class="lamp${q ? ' on' : ''}" aria-label="Q = ${q ? 1 : 0}">Q = ${q ? 1 : 0}</span>
        </div>
        <p class="small">I Life är en minnesbit ofta ett stilla mönster som en glider kan slå till eller från, eller en glider som cirkulerar i en slinga av reflektorer.</p>
      </li>
      <li>
        <h3>3. Minne i kedja ger räknare</h3>
        <p>Låt varje minnesbit vända sitt värde när biten före går från 1 till 0. Varje klockpuls – i Life en glider från ett glidervapen – räknar då upp ett binärt tal.</p>
        <div class="mini" role="group" aria-label="Räknare">
          <button type="button" data-action="tick">Klockpuls</button>
          <button type="button" data-action="zero">Nollställ</button>
          <span class="bits">${bits.map((b) => `<span class="lamp${b ? ' on' : ''}">${b}</span>`).join('')}</span>
          <span class="small">= ${n}</span>
        </div>
      </li>
      <li>
        <h3>4. Delarna blir en dator</h3>
        <div class="flow cpu"><span>klocka</span><i>→</i><span>programräknare</span><i>→</i><span>programminne</span><i>→</i><span>styrlogik</span><i>→</i><span>ALU (adderare)</span><i>→</i><span>register</span></div>
        <p>Klockan driver en räknare som pekar ut nästa instruktion i minnet. Styrlogiken – bara grindar – avgör vad ALU:n ska räkna och var resultatet ska sparas. Allt är byggt av samma tre saker: signaler, kollisioner och minne.</p>
      </li>
    </ol>`;
}

schematic.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'set') lesson.latch = true;
  if (action === 'reset') lesson.latch = false;
  if (action === 'tick') lesson.counter = (lesson.counter + 1) % 8;
  if (action === 'zero') lesson.counter = 0;
  renderSchematic();
  schematic.querySelector(`[data-action="${action}"]`).focus();
});

/* ---------- Vyer och steg ---------- */

function renderLessonText() {
  const s = steps[lesson.step];
  $('#lessonCount').textContent = `Steg ${lesson.step + 1} av ${steps.length}`;
  $('#lessonTitle').textContent = s.title;
  const badge = $('#lessonBadge');
  badge.textContent = s.kind === 'sim' ? 'Verklig Life-simulering' : 'Schematisk förklaring';
  badge.className = `badge ${s.kind === 'sim' ? 'sim' : 'schema'}`;
  $('#lessonText').innerHTML = typeof s.text === 'function' ? s.text() : s.text;
  $('#prevStepBtn').disabled = lesson.step === 0;
  $('#nextStepBtn').disabled = lesson.step === steps.length - 1;
}

function showStep(i) {
  lesson.step = i;
  const s = steps[i];
  for (const button of stepNav.children) {
    const active = Number(button.dataset.step) === i;
    button.classList.toggle('selected', active);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
  const sim = s.kind === 'sim';
  $('#boardArea').hidden = !sim;
  $('#controls').hidden = !sim;
  lessonPanel.hidden = !sim;
  schematic.hidden = sim;
  renderLessonText();
  if (sim) {
    loadScene();
  } else {
    stop();
    renderSchematic();
  }
}

function setView(view) {
  stop();
  currentView = view;
  const logic = view === 'logic';
  for (const tab of document.querySelectorAll('.view-tabs [role="tab"]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  }
  $('#labAside').hidden = logic;
  $('#labFooter').hidden = logic;
  $('#logicAside').hidden = !logic;
  $('#logicFooter').hidden = !logic;
  stepNav.hidden = !logic;
  randomBtn.hidden = logic;
  clearBtn.hidden = logic;
  resetBtn.hidden = !logic;
  history.replaceState(null, '', logic ? '#logik' : location.pathname + location.search);
  if (logic) {
    showStep(lesson.step);
  } else {
    scene = null;
    labelsEl.replaceChildren();
    $('#boardArea').hidden = false;
    $('#controls').hidden = false;
    lessonPanel.hidden = true;
    schematic.hidden = true;
    setBoardSize(LAB_ROWS, LAB_COLS);
    setMarks(null);
    loadPattern(selectedPattern);
  }
}

for (const el of document.querySelectorAll('[data-view]')) {
  el.addEventListener('click', () => {
    setView(el.dataset.view);
    if (el.classList.contains('link')) $('#tabLogic').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
$('#prevStepBtn').addEventListener('click', () => showStep(Math.max(0, lesson.step - 1)));
$('#nextStepBtn').addEventListener('click', () => showStep(Math.min(steps.length - 1, lesson.step + 1)));

runBtn.addEventListener('click', () => running ? stop() : start());
stepBtn.addEventListener('click', step);
randomBtn.addEventListener('click', randomize);
clearBtn.addEventListener('click', clearGrid);
resetBtn.addEventListener('click', loadScene);
speedInput.addEventListener('input', () => { if (running) start(); });

buildPatternButtons();
buildStepNav();
setView(location.hash === '#logik' ? 'logic' : 'lab');
