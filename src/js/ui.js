import { ACTIONS, APP_VERSION, MODES, RUN_END_TYPE, STATS } from './config.js';
import { icon } from './icons.js';
import { formatTime } from './logic.js';
import { analyzeDefeat } from './result-analysis.js';
import { TUTORIAL_STEPS } from './tutorial.js';

const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen'),
  pause: document.getElementById('pause-screen'),
};

const nodes = {
  sdkStatus: document.getElementById('sdk-status'),
  modeList: document.getElementById('mode-list'),
  bestScore: document.getElementById('best-score'),
  bestTestScore: document.getElementById('best-test-score'),
  totalWins: document.getElementById('total-wins'),
  totalRuns: document.getElementById('total-runs'),
  startBtn: document.getElementById('start-game-btn'),
  tutorialBtn: document.getElementById('tutorial-btn'),
  appVersion: document.getElementById('app-version'),
  pauseBtn: document.getElementById('pause-btn'),
  resumeBtn: document.getElementById('resume-btn'),
  menuBtn: document.getElementById('menu-btn'),
  rewardBtn: document.getElementById('reward-btn'),
  modeTitle: document.getElementById('mode-title'),
  timeLabel: document.getElementById('time-label'),
  timeLeft: document.getElementById('time-left'),
  score: document.getElementById('score'),
  stats: document.getElementById('stats'),
  boardState: document.getElementById('board-state'),
  teacherState: document.getElementById('teacher-state'),
  studentState: document.getElementById('student-state'),
  teacherLabel: document.getElementById('teacher-label'),
  studentLabel: document.getElementById('student-label'),
  eventVisual: document.getElementById('event-visual'),
  eventIcon: document.getElementById('event-icon'),
  eventShort: document.getElementById('event-short'),
  effectLayer: document.getElementById('effect-layer'),
  eventType: document.getElementById('event-type'),
  eventTitle: document.getElementById('event-title'),
  eventDanger: document.getElementById('event-danger'),
  actionsGrid: document.getElementById('actions-grid'),
  logList: document.getElementById('log-list'),
  resultCard: document.getElementById('result-card'),
  resultIcon: document.getElementById('result-icon'),
  resultTitle: document.getElementById('result-title'),
  resultText: document.getElementById('result-text'),
  resultRecap: document.getElementById('result-recap'),
  resultScore: document.getElementById('result-score'),
  resultKnowledge: document.getElementById('result-knowledge'),
  unlockedModes: document.getElementById('unlocked-modes'),
  resultReason: document.getElementById('result-reason'),
  resultReasonIcon: document.getElementById('result-reason-icon'),
  resultReasonTitle: document.getElementById('result-reason-title'),
  resultReasonText: document.getElementById('result-reason-text'),
  resultReasonMetric: document.getElementById('result-reason-metric'),
  resultSecondaryList: document.getElementById('result-secondary-list'),
  playAgainBtn: document.getElementById('play-again-btn'),
  pauseTitle: document.getElementById('pause-title'),
  pauseText: document.getElementById('pause-text'),
  tutorialOverlay: document.getElementById('tutorial-overlay'),
  tutorialProgress: document.getElementById('tutorial-progress'),
  tutorialTitle: document.getElementById('tutorial-title'),
  tutorialText: document.getElementById('tutorial-text'),
  tutorialNextBtn: document.getElementById('tutorial-next-btn'),
  tutorialSkipBtn: document.getElementById('tutorial-skip-btn'),
};

const ACTION_META = {
  listen: { icon: 'i-listen', hint: '+знания · -сонливость' },
  pretend: { icon: 'i-pretend', hint: '-подозрение · +контроль' },
  phone: { icon: 'i-phone', hint: '+фокус · риск спалиться' },
  cheat: { icon: 'i-cheat', hint: '+очки · +риск' },
  answer: { icon: 'i-answer', hint: 'сильный ответ спасает в критике' },
  ignore: { icon: 'i-ignore', hint: 'быстро, но рискованно' },
  excuse: { icon: 'i-excuse', hint: 'снимает давление, если сработает' },
  leave: { icon: 'i-leave', hint: '-стресс · -знания' },
};

const EVENT_VISUAL = {
  teacher_look: { icon: 'i-teacher-look', short: 'Учитель следит', teacher: 'suspect', student: 'exposed' },
  called_to_answer: { icon: 'i-called-to-answer', short: 'Тебя спросили', teacher: 'question', student: 'panic' },
  neighbor_help: { icon: 'i-neighbor-help', short: 'Сосед просит помощь', teacher: 'neutral', student: 'focused' },
  phone_message: { icon: 'i-phone-message', short: 'Новое сообщение', teacher: 'look', student: 'tense' },
  sleep_attack: { icon: 'i-sleep-attack', short: 'Клонит в сон', teacher: 'neutral', student: 'sleepy' },
  notebook_check: { icon: 'i-notebook-check', short: 'Проверка тетрадей', teacher: 'pressure', student: 'tense' },
  mini_test: { icon: 'i-mini-test', short: 'Мини-контрольная', teacher: 'pressure', student: 'panic' },
  board_call: { icon: 'i-board-call', short: 'К доске', teacher: 'question', student: 'panic' },
};

const STAT_META = {
  sleepiness: { icon: 'i-sleepiness', className: 'is-sleepiness' },
  stress: { icon: 'i-stress', className: 'is-stress' },
  suspicion: { icon: 'i-suspicion', className: 'is-suspicion' },
  knowledge: { icon: 'i-knowledge', className: 'is-knowledge' },
};

let prevSnapshot = null;
let prevEventId = null;
let highlightedNode = null;

function setIcon(node, symbolId, className = '') {
  node.innerHTML = icon(symbolId, className);
}

function clearTutorialHighlight() {
  if (highlightedNode) {
    highlightedNode.classList.remove('tutorial-highlight');
    highlightedNode = null;
  }
  document.body.classList.remove('tutorial-active');
}

function setTutorialHighlight(selector) {
  clearTutorialHighlight();

  if (!selector) {
    document.body.classList.add('tutorial-active');
    return;
  }

  const target = document.querySelector(selector);
  document.body.classList.add('tutorial-active');

  if (!target) return;

  target.classList.add('tutorial-highlight');
  highlightedNode = target;
}

export function resetUiRuntime() {
  prevSnapshot = null;
  prevEventId = null;
}

export function switchScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle('screen--active', key === name);
  });
}

export function renderSdkStatus(text) {
  nodes.sdkStatus.textContent = text;
}

export function renderStart(save, selectedMode, onModeSelect) {
  nodes.modeList.innerHTML = '';

  Object.values(MODES).forEach((mode) => {
    const unlocked = save.unlockedModes.includes(mode.id);
    const btn = document.createElement('button');
    btn.className = 'mode';
    if (selectedMode === mode.id) btn.classList.add('mode--active');
    if (!unlocked) btn.classList.add('mode--locked');

    btn.innerHTML = `<strong>${mode.title}</strong><small>${
      unlocked ? mode.objective : `Откроется от ${mode.unlockScore} очков`
    }</small>`;
    btn.disabled = !unlocked;
    btn.addEventListener('click', () => onModeSelect(mode.id));
    nodes.modeList.appendChild(btn);
  });

  nodes.bestScore.textContent = String(save.bestScore);
  nodes.bestTestScore.textContent = String(save.bestTestScore);
  nodes.totalWins.textContent = String(save.stats.wins);
  nodes.totalRuns.textContent = String(save.stats.runs);
  nodes.startBtn.textContent = `Начать: ${MODES[selectedMode].title}`;
  nodes.tutorialBtn.textContent = 'Обучение';
  nodes.appVersion.textContent = `Версия ${APP_VERSION}`;
}

function createStatCard(key, value) {
  const meta = STATS[key];
  const visual = STAT_META[key];
  const highRisk = meta.type === 'negative';
  const tone = highRisk && value >= 75 ? 'bar--high' : highRisk && value >= 50 ? 'bar--mid' : key === 'knowledge' ? 'bar--knowledge' : '';

  const stat = document.createElement('article');
  stat.className = `hud-card ${visual.className} ${value >= 80 && highRisk ? 'hud-card--critical' : ''}`;
  stat.innerHTML = `
    <div class="hud-card__head">
      <span class="hud-card__icon">${icon(visual.icon, 'ui-icon--sm')}</span>
      <strong>${meta.label}</strong>
      <b>${value}</b>
    </div>
    <div class="bar ${tone}"><span style="width:${value}%"></span></div>
  `;
  return stat;
}

function inferStudentState(state) {
  if (state.ended) return state.win ? { mood: 'joy', label: 'Выжил' } : { mood: 'down', label: 'Сорвался' };
  if (state.stats.suspicion >= 75) return { mood: 'exposed', label: 'Палится' };
  if (state.stats.stress >= 70) return { mood: 'panic', label: 'На нервах' };
  if (state.stats.sleepiness >= 65) return { mood: 'sleepy', label: 'Клонит в сон' };
  if (state.activeEvent?.important) return { mood: 'tense', label: 'Напряжён' };
  return { mood: 'calm', label: 'Держится' };
}

function inferTeacherState(state) {
  if (state.ended && !state.win) return { mood: 'pressure', label: 'Дожал' };
  if (state.stats.suspicion >= 70) return { mood: 'suspect', label: 'Подозревает' };
  if (state.activeEvent?.id) {
    const mapped = EVENT_VISUAL[state.activeEvent.id];
    if (mapped) {
      const labels = {
        neutral: 'Нейтрально',
        look: 'Смотрит на тебя',
        suspect: 'Подозревает',
        question: 'Задает вопрос',
        pressure: 'Давит на класс',
      };
      return { mood: mapped.teacher, label: labels[mapped.teacher] ?? 'Внимателен' };
    }
  }
  return { mood: 'neutral', label: 'Нейтрально' };
}

function renderSceneState(state) {
  const student = inferStudentState(state);
  const teacher = inferTeacherState(state);

  nodes.studentState.className = `student mood-${student.mood}`;
  nodes.studentLabel.textContent = student.label;

  nodes.teacherState.className = `teacher mood-${teacher.mood}`;
  nodes.teacherLabel.textContent = teacher.label;

  if (state.activeEvent?.id) {
    const visual = EVENT_VISUAL[state.activeEvent.id] ?? { icon: 'i-alert', short: 'Ситуация', student: student.mood };
    nodes.eventVisual.hidden = false;
    nodes.eventVisual.classList.remove('pulse');
    setIcon(nodes.eventIcon, visual.icon, 'ui-icon--sm');
    nodes.eventShort.textContent = visual.short;
    nodes.boardState.textContent = visual.short;
    if (prevEventId !== state.activeEvent.id) {
      nodes.eventVisual.classList.add('pulse');
    }
    prevEventId = state.activeEvent.id;
    return;
  }

  prevEventId = null;
  nodes.eventVisual.hidden = true;
  nodes.boardState.textContent = 'Тихий урок';
}

function spawnEffect(symbolId, text, tone = 'plus') {
  const bubble = document.createElement('div');
  bubble.className = `float-effect float-effect--${tone}`;
  bubble.innerHTML = `${icon(symbolId, 'ui-icon--xs')}<span>${text}</span>`;
  nodes.effectLayer.appendChild(bubble);
  setTimeout(() => bubble.remove(), 900);
}

function renderStatEffects(state) {
  if (!prevSnapshot) {
    prevSnapshot = { ...state.stats };
    return;
  }

  const watch = [
    ['score', 'i-score', 1],
    ['stress', 'i-stress', 3],
    ['suspicion', 'i-suspicion', 3],
    ['sleepiness', 'i-sleepiness', 3],
    ['knowledge', 'i-knowledge', 3],
  ];

  watch.forEach(([key, symbolId, threshold]) => {
    const diff = Math.round(state.stats[key] - prevSnapshot[key]);
    if (Math.abs(diff) < threshold) return;

    const sign = diff > 0 ? '+' : '';
    const friendlyPositive = key === 'score' || key === 'knowledge';
    const tone = diff > 0 ? (friendlyPositive ? 'plus' : 'minus') : friendlyPositive ? 'minus' : 'plus';
    spawnEffect(symbolId, `${sign}${diff}`, tone);
  });

  if (state.stats.suspicion >= 85 || state.stats.stress >= 85 || state.stats.sleepiness >= 85) {
    nodes.effectLayer.classList.add('critical');
  } else {
    nodes.effectLayer.classList.remove('critical');
  }

  prevSnapshot = { ...state.stats };
}

export function renderGame(state) {
  const mode = MODES[state.modeId];
  nodes.modeTitle.textContent = mode.title;
  nodes.timeLabel.textContent = mode.timeLabel;
  nodes.timeLeft.textContent = formatTime(state.timeLeftSec);
  nodes.score.textContent = String(Math.round(state.stats.score));

  nodes.stats.innerHTML = '';
  Object.entries(STATS).forEach(([key]) => {
    if (key === 'score') return;
    const value = Math.round(state.stats[key]);
    nodes.stats.appendChild(createStatCard(key, value));
  });

  renderSceneState(state);

  if (state.activeEvent) {
    nodes.eventType.textContent = state.activeEvent.important ? 'Критическое событие' : 'Событие в классе';
    nodes.eventTitle.textContent = state.activeEvent.title;
    nodes.eventDanger.textContent = `Опасность: ${state.activeEvent.danger}`;
  } else {
    nodes.eventType.textContent = 'Спокойная фаза';
    nodes.eventTitle.textContent = 'Пока всё спокойно. Держи темп и не копи проблемы.';
    nodes.eventDanger.textContent = `Темп урока: x${state.difficulty.toFixed(2)}`;
  }

  nodes.logList.innerHTML = '';
  state.log.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.textContent = entry;
    nodes.logList.appendChild(li);
  });

  renderStatEffects(state);
}

export function renderActions(onAction) {
  nodes.actionsGrid.innerHTML = '';
  ACTIONS.forEach((action) => {
    const meta = ACTION_META[action.id] ?? { icon: 'i-score', hint: 'Действие' };
    const btn = document.createElement('button');
    btn.className = 'btn action-btn';
    btn.innerHTML = `
      <span class="action-btn__icon">${icon(meta.icon, 'ui-icon--sm')}</span>
      <span>
        <b>${action.label}</b>
        <small>${meta.hint}</small>
      </span>
    `;
    btn.addEventListener('click', () => {
      btn.classList.add('action-btn--pressed');
      setTimeout(() => btn.classList.remove('action-btn--pressed'), 220);
      onAction(action.id);
    });
    nodes.actionsGrid.appendChild(btn);
  });
}

function renderResultReason(state) {
  const defeat = analyzeDefeat(state);
  nodes.resultReason.hidden = false;
  nodes.resultReason.className = `result__reason tone-${defeat.primary.tone}`;
  setIcon(nodes.resultReasonIcon, defeat.primary.icon, 'ui-icon--md');
  nodes.resultReasonTitle.textContent = defeat.primary.title;
  nodes.resultReasonText.textContent = defeat.primary.text;
  nodes.resultReasonMetric.textContent = defeat.primary.metric;

  nodes.resultSecondaryList.innerHTML = '';
  defeat.secondary.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    nodes.resultSecondaryList.appendChild(li);
  });
  nodes.resultSecondaryList.hidden = defeat.secondary.length === 0;
}

export function renderResult(state, save) {
  const mode = MODES[state.modeId];
  const isEndlessRun = state.endType === RUN_END_TYPE.ENDLESS_RECORD;

  if (state.win) {
    setIcon(nodes.resultIcon, 'i-result-win', 'ui-icon--xl');
    nodes.resultTitle.textContent = mode.resultWinTitle;
    nodes.resultText.textContent = mode.resultWinText;
    nodes.resultRecap.textContent = `Цель режима выполнена: ${mode.objective.toLowerCase()}`;
    nodes.resultReason.hidden = true;
  } else if (isEndlessRun) {
    setIcon(nodes.resultIcon, 'i-result-record', 'ui-icon--xl');
    nodes.resultTitle.textContent = mode.resultWinTitle;
    nodes.resultText.textContent = `${state.endReason} Это финал рекордного забега.`;
    nodes.resultRecap.textContent = 'Бесконечный режим заканчивается только поражением. Сравни результат с рекордом и попробуй ещё раз.';
    renderResultReason(state);
  } else {
    setIcon(nodes.resultIcon, 'i-result-lose', 'ui-icon--xl');
    nodes.resultTitle.textContent = 'Поражение';
    nodes.resultText.textContent = state.endReason;
    nodes.resultRecap.textContent = 'Причина ниже показывает, что именно пошло не так и что стоит исправить в следующем забеге.';
    renderResultReason(state);
  }

  nodes.resultScore.textContent = String(Math.round(state.stats.score));
  nodes.resultKnowledge.textContent = String(Math.round(state.stats.knowledge));
  nodes.unlockedModes.textContent = String(save.unlockedModes.length);
  nodes.resultCard.classList.toggle('result--win', state.win);
  nodes.resultCard.classList.toggle('result--lose', !state.win && !isEndlessRun);
  nodes.resultCard.classList.toggle('result--record', isEndlessRun);
  nodes.rewardBtn.disabled = state.win || state.continueUsed;
}

export function renderPause(isSystemPause) {
  nodes.pauseTitle.textContent = isSystemPause ? 'Системная пауза' : 'Пауза';
  nodes.pauseText.textContent = isSystemPause
    ? 'Платформа приостановила игру из-за рекламы или потери фокуса.'
    : 'Передохни и возвращайся к выживанию на уроке.';
  nodes.resumeBtn.disabled = isSystemPause;
}

export function renderTutorial(step, { stepIndex, nextLabel }) {
  if (!step) return;

  nodes.tutorialOverlay.hidden = false;
  nodes.tutorialProgress.textContent = `Шаг ${stepIndex + 1}/${TUTORIAL_STEPS.length}`;
  nodes.tutorialTitle.textContent = step.title;
  nodes.tutorialText.textContent = step.text;
  nodes.tutorialNextBtn.textContent = nextLabel;
  setTutorialHighlight(step.target);
}

export function hideTutorial() {
  nodes.tutorialOverlay.hidden = true;
  clearTutorialHighlight();
}

export function bindStaticHandlers(handlers) {
  nodes.startBtn.addEventListener('click', handlers.onStart);
  nodes.tutorialBtn.addEventListener('click', handlers.onTutorialOpen);
  nodes.playAgainBtn.addEventListener('click', handlers.onReplay);
  nodes.pauseBtn.addEventListener('click', handlers.onPause);
  nodes.resumeBtn.addEventListener('click', handlers.onResume);
  nodes.menuBtn.addEventListener('click', handlers.onMenu);
  nodes.rewardBtn.addEventListener('click', handlers.onRewardedContinue);
  nodes.tutorialNextBtn.addEventListener('click', handlers.onTutorialNext);
  nodes.tutorialSkipBtn.addEventListener('click', handlers.onTutorialSkip);
}
