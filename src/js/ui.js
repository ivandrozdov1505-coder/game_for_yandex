import { ACTIONS, APP_VERSION, MODES, STATS } from './config.js';
import { formatTime } from './logic.js';

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
  appVersion: document.getElementById('app-version'),
  pauseBtn: document.getElementById('pause-btn'),
  resumeBtn: document.getElementById('resume-btn'),
  menuBtn: document.getElementById('menu-btn'),
  rewardBtn: document.getElementById('reward-btn'),
  modeTitle: document.getElementById('mode-title'),
  timeLeft: document.getElementById('time-left'),
  score: document.getElementById('score'),
  stats: document.getElementById('stats'),
  boardState: document.getElementById('board-state'),
  teacherState: document.getElementById('teacher-state'),
  studentState: document.getElementById('student-state'),
  teacherEmoji: document.getElementById('teacher-emoji'),
  studentEmoji: document.getElementById('student-emoji'),
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
  resultMood: document.getElementById('result-mood'),
  resultTitle: document.getElementById('result-title'),
  resultText: document.getElementById('result-text'),
  resultRecap: document.getElementById('result-recap'),
  resultScore: document.getElementById('result-score'),
  resultKnowledge: document.getElementById('result-knowledge'),
  unlockedModes: document.getElementById('unlocked-modes'),
  playAgainBtn: document.getElementById('play-again-btn'),
  pauseTitle: document.getElementById('pause-title'),
  pauseText: document.getElementById('pause-text'),
};

const ACTION_META = {
  listen: { icon: '👂', hint: '+знания · -сонливость' },
  pretend: { icon: '📝', hint: '-подозрение · +контроль' },
  phone: { icon: '📱', hint: '+фокус · риск спалиться' },
  cheat: { icon: '🕵️', hint: '+очки · +риск' },
  answer: { icon: '💬', hint: 'может дать большой буст' },
  ignore: { icon: '🙈', hint: 'быстро, но рискованно' },
  excuse: { icon: '🎭', hint: 'снимает давление, если прокатит' },
  leave: { icon: '🚪', hint: '-стресс · -знания' },
};

const EVENT_VISUAL = {
  teacher_look: { icon: '👀', short: 'Учитель следит', teacher: 'suspect', student: 'exposed' },
  called_to_answer: { icon: '❓', short: 'Тебя спросили', teacher: 'question', student: 'panic' },
  neighbor_help: { icon: '🤝', short: 'Сосед просит помощь', teacher: 'neutral', student: 'focused' },
  phone_message: { icon: '📱', short: 'Новое сообщение', teacher: 'look', student: 'tense' },
  sleep_attack: { icon: '💤', short: 'Клонит в сон', teacher: 'neutral', student: 'sleepy' },
  notebook_check: { icon: '📓', short: 'Проверка тетрадей', teacher: 'pressure', student: 'tense' },
  mini_test: { icon: '🧪', short: 'Мини-контрольная', teacher: 'pressure', student: 'panic' },
  board_call: { icon: '📌', short: 'К доске!', teacher: 'question', student: 'panic' },
};

const STAT_META = {
  sleepiness: { icon: '😴', className: 'is-sleepiness' },
  stress: { icon: '⚡', className: 'is-stress' },
  suspicion: { icon: '👁️', className: 'is-suspicion' },
  knowledge: { icon: '💡', className: 'is-knowledge' },
};

let prevSnapshot = null;
let prevEventId = null;

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
      unlocked ? 'Готово к запуску' : `Откроется от ${mode.unlockScore} очков`
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
  nodes.appVersion.textContent = `Версия ${APP_VERSION}`;
}

function createStatCard(key, value) {
  const meta = STATS[key];
  const visual = STAT_META[key];
  const highRisk = ['sleepiness', 'suspicion', 'stress'].includes(key);
  const tone = highRisk && value >= 75 ? 'bar--high' : highRisk && value >= 50 ? 'bar--mid' : '';

  const stat = document.createElement('article');
  stat.className = `hud-card ${visual.className} ${value >= 80 && highRisk ? 'hud-card--critical' : ''}`;
  stat.innerHTML = `
    <div class="hud-card__head">
      <span>${visual.icon}</span>
      <strong>${meta.label}</strong>
      <b>${value}</b>
    </div>
    <div class="bar ${tone}"><span style="width:${value}%"></span></div>
  `;
  return stat;
}

function inferStudentState(state) {
  if (state.ended) return state.win ? { mood: 'joy', label: 'Ура, выжил!' } : { mood: 'down', label: 'Провал' };
  if (state.stats.suspicion >= 75) return { mood: 'exposed', label: 'Палится!' };
  if (state.stats.stress >= 70) return { mood: 'panic', label: 'На нервах' };
  if (state.stats.sleepiness >= 65) return { mood: 'sleepy', label: 'Клонит в сон' };
  if (state.activeEvent?.important) return { mood: 'tense', label: 'Напряжён' };
  return { mood: 'calm', label: 'Спокойно' };
}

function inferTeacherState(state) {
  if (state.ended && !state.win) return { mood: 'pressure', label: 'Дожал', emoji: '🧑‍🏫' };
  if (state.stats.suspicion >= 70) return { mood: 'suspect', label: 'Подозревает', emoji: '🧐' };
  if (state.activeEvent?.id) {
    const mapped = EVENT_VISUAL[state.activeEvent.id];
    if (mapped) {
      const labels = {
        neutral: 'Нейтрально',
        look: 'Смотрит на тебя',
        suspect: 'Подозревает',
        question: 'Задаёт вопрос',
        pressure: 'Давит на класс',
      };
      return { mood: mapped.teacher, label: labels[mapped.teacher] ?? 'Внимателен', emoji: mapped.teacher === 'question' ? '❗' : '👩‍🏫' };
    }
  }
  return { mood: 'neutral', label: 'Нейтрально', emoji: '👩‍🏫' };
}

function renderSceneState(state) {
  const student = inferStudentState(state);
  const teacher = inferTeacherState(state);

  nodes.studentState.className = `student mood-${student.mood}`;
  nodes.studentLabel.textContent = student.label;
  nodes.studentEmoji.textContent = student.mood === 'sleepy' ? '😵‍💫' : student.mood === 'panic' ? '😬' : student.mood === 'joy' ? '😎' : student.mood === 'down' ? '😵' : '🧑‍🎓';

  nodes.teacherState.className = `teacher mood-${teacher.mood}`;
  nodes.teacherLabel.textContent = teacher.label;
  nodes.teacherEmoji.textContent = teacher.emoji;

  if (state.activeEvent?.id) {
    const visual = EVENT_VISUAL[state.activeEvent.id] ?? { icon: '⚠️', short: 'Ситуация', student: student.mood };
    nodes.eventVisual.hidden = false;
    nodes.eventVisual.classList.remove('pulse');
    nodes.eventIcon.textContent = visual.icon;
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

function spawnEffect(text, tone = 'plus') {
  const bubble = document.createElement('div');
  bubble.className = `float-effect float-effect--${tone}`;
  bubble.textContent = text;
  nodes.effectLayer.appendChild(bubble);
  setTimeout(() => bubble.remove(), 900);
}

function renderStatEffects(state) {
  if (!prevSnapshot) {
    prevSnapshot = { ...state.stats };
    return;
  }

  const watch = [
    ['score', '⭐', 1],
    ['stress', '⚡', 3],
    ['suspicion', '👁️', 3],
    ['sleepiness', '😴', 3],
    ['knowledge', '💡', 3],
  ];

  watch.forEach(([key, icon, threshold]) => {
    const diff = Math.round(state.stats[key] - prevSnapshot[key]);
    if (Math.abs(diff) < threshold) return;

    const sign = diff > 0 ? '+' : '';
    const friendlyPositive = key === 'score' || key === 'knowledge';
    const tone = diff > 0 ? (friendlyPositive ? 'plus' : 'minus') : friendlyPositive ? 'minus' : 'plus';
    spawnEffect(`${icon} ${sign}${diff}`, tone);
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
    nodes.eventTitle.textContent = 'Пока всё спокойно... держи темп.';
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
    const meta = ACTION_META[action.id] ?? { icon: '🎮', hint: 'Действие' };
    const btn = document.createElement('button');
    btn.className = 'btn action-btn';
    btn.innerHTML = `<span class="action-btn__icon">${meta.icon}</span><span><b>${action.label}</b><small>${meta.hint}</small></span>`;
    btn.addEventListener('click', () => {
      btn.classList.add('action-btn--pressed');
      setTimeout(() => btn.classList.remove('action-btn--pressed'), 220);
      onAction(action.id);
    });
    nodes.actionsGrid.appendChild(btn);
  });
}

export function renderResult(state, save) {
  nodes.resultTitle.textContent = state.win ? 'Звонок! Ты выжил урок 🎉' : 'Поражение 😵';
  nodes.resultText.textContent = state.endReason;
  nodes.resultRecap.textContent = state.win
    ? 'Чёткий забег: держал баланс и дожил до конца.'
    : 'Нажми «Ещё раз» и попробуй пережить следующий урок.';
  nodes.resultScore.textContent = String(Math.round(state.stats.score));
  nodes.resultKnowledge.textContent = String(Math.round(state.stats.knowledge));
  nodes.unlockedModes.textContent = String(save.unlockedModes.length);
  nodes.resultMood.textContent = state.win ? '🥳' : '😵';
  nodes.resultCard.classList.toggle('result--win', state.win);
  nodes.resultCard.classList.toggle('result--lose', !state.win);
  nodes.rewardBtn.disabled = state.win || state.continueUsed;
}

export function renderPause(isSystemPause) {
  nodes.pauseTitle.textContent = isSystemPause ? 'Системная пауза' : 'Пауза';
  nodes.pauseText.textContent = isSystemPause
    ? 'Платформа приостановила игру (реклама/потеря фокуса).'
    : 'Передохни и возвращайся к выживанию на уроке.';
  nodes.resumeBtn.disabled = isSystemPause;
}

export function bindStaticHandlers(handlers) {
  nodes.startBtn.addEventListener('click', handlers.onStart);
  nodes.playAgainBtn.addEventListener('click', handlers.onReplay);
  nodes.pauseBtn.addEventListener('click', handlers.onPause);
  nodes.resumeBtn.addEventListener('click', handlers.onResume);
  nodes.menuBtn.addEventListener('click', handlers.onMenu);
  nodes.rewardBtn.addEventListener('click', handlers.onRewardedContinue);
}
