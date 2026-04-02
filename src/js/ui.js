import { ACTIONS, APP_VERSION, MODES, STATS } from './config.js';
import { formatTime } from './logic.js';

const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen'),
};

const nodes = {
  modeList: document.getElementById('mode-list'),
  bestScore: document.getElementById('best-score'),
  bestTestScore: document.getElementById('best-test-score'),
  startBtn: document.getElementById('start-game-btn'),
  modeTitle: document.getElementById('mode-title'),
  timeLeft: document.getElementById('time-left'),
  score: document.getElementById('score'),
  stats: document.getElementById('stats'),
  eventTitle: document.getElementById('event-title'),
  eventDanger: document.getElementById('event-danger'),
  actionsGrid: document.getElementById('actions-grid'),
  logList: document.getElementById('log-list'),
  resultTitle: document.getElementById('result-title'),
  resultText: document.getElementById('result-text'),
  resultScore: document.getElementById('result-score'),
  resultKnowledge: document.getElementById('result-knowledge'),
  unlockedModes: document.getElementById('unlocked-modes'),
  playAgainBtn: document.getElementById('play-again-btn'),
};

export function switchScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle('screen--active', key === name);
  });
}

export function renderStart(state, selectedMode, onModeSelect) {
  nodes.modeList.innerHTML = '';

  Object.values(MODES).forEach((mode) => {
    const unlocked = state.unlockedModes.includes(mode.id);
    const btn = document.createElement('button');
    btn.className = 'mode';
    if (selectedMode === mode.id) btn.classList.add('mode--active');
    if (!unlocked) btn.classList.add('mode--locked');

    btn.innerHTML = `<strong>${mode.title}</strong><br><small>${
      unlocked ? 'Доступно' : `Откроется от ${mode.unlockScore} очков`
    }</small>`;
    btn.disabled = !unlocked;
    btn.addEventListener('click', () => onModeSelect(mode.id));
    nodes.modeList.appendChild(btn);
  });

  nodes.bestScore.textContent = String(state.bestScore);
  nodes.bestTestScore.textContent = String(state.bestTestScore);
  nodes.startBtn.textContent = `Начать (${MODES[selectedMode].title})`;
  nodes.playAgainBtn.textContent = `Ещё раз • v${APP_VERSION}`;
}

function barClass(key, value) {
  const highRisk = ['sleepiness', 'suspicion', 'stress'].includes(key);
  if (!highRisk) return '';
  if (value >= 75) return 'bar bar--high';
  if (value >= 50) return 'bar bar--mid';
  return 'bar';
}

export function renderGame(state) {
  const mode = MODES[state.modeId];
  nodes.modeTitle.textContent = mode.title;
  nodes.timeLeft.textContent = formatTime(state.timeLeftSec);
  nodes.score.textContent = String(Math.round(state.stats.score));

  nodes.stats.innerHTML = '';
  Object.entries(STATS).forEach(([key, meta]) => {
    if (key === 'score') return;
    const value = Math.round(state.stats[key]);
    const stat = document.createElement('div');
    stat.className = 'stat';
    stat.innerHTML = `<strong>${meta.label}: ${value}</strong>
      <div class="${barClass(key, value)}"><span style="width:${value}%"></span></div>`;
    nodes.stats.appendChild(stat);
  });

  if (state.activeEvent) {
    nodes.eventTitle.textContent = state.activeEvent.title;
    nodes.eventDanger.textContent = `Опасность: ${state.activeEvent.danger}`;
  } else {
    nodes.eventTitle.textContent = 'Пока всё спокойно... держи темп.';
    nodes.eventDanger.textContent = `Сложность: x${state.difficulty.toFixed(2)}`;
  }

  nodes.logList.innerHTML = '';
  state.log.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.textContent = entry;
    nodes.logList.appendChild(li);
  });
}

export function renderActions(onAction) {
  nodes.actionsGrid.innerHTML = '';
  ACTIONS.forEach((action) => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = action.label;
    btn.addEventListener('click', () => onAction(action.id));
    nodes.actionsGrid.appendChild(btn);
  });
}

export function renderResult(state) {
  nodes.resultTitle.textContent = state.win ? 'Ты выжил урок 🎉' : 'Поражение 😵';
  nodes.resultText.textContent = state.endReason;
  nodes.resultScore.textContent = String(Math.round(state.stats.score));
  nodes.resultKnowledge.textContent = String(Math.round(state.stats.knowledge));
  nodes.unlockedModes.textContent = String(state.unlockedModes.length);
}

export function bindStaticHandlers({ onStart, onReplay }) {
  nodes.startBtn.addEventListener('click', onStart);
  nodes.playAgainBtn.addEventListener('click', onReplay);
}
