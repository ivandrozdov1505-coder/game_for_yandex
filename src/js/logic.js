import { ACTIONS, LOSS_REASON, MODES, RUN_END_TYPE } from './config.js';
import { EVENTS } from './events.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(rnd(min, max + 1));
}

function pushLog(state, text) {
  state.log = [text, ...state.log].slice(0, 9);
}

function calcDifficulty(elapsedSec, mode) {
  const phase = Math.min(1.6, 1 + elapsedSec / Math.max(90, (mode.durationSec ?? 180) * 0.9));
  const endlessGrowth = mode.durationSec ? 0 : (elapsedSec / 60) * mode.endlessRampPerMinute;
  return (phase + endlessGrowth) * mode.difficultyScale;
}

function sampleEvent(state, mode) {
  const progress = mode.durationSec ? state.elapsedSec / mode.durationSec : Math.min(1, state.elapsedSec / 180);
  const recent = state.eventHistory.slice(-2);
  const pool = EVENTS.filter((ev) => {
    if (progress < ev.minProgress) return false;
    return !recent.includes(ev.id);
  });

  const fallback = pool.length ? pool : EVENTS;
  const weighted = fallback.map((ev) => {
    let weight = ev.weight;
    if (state.stats.suspicion > 60 && ['teacher_look', 'notebook_check', 'board_call'].includes(ev.id)) {
      weight *= 1.3;
    }
    if (state.stats.sleepiness > 65 && ev.id === 'sleep_attack') {
      weight *= 1.6;
    }
    if (mode.id === 'test' && ['mini_test', 'called_to_answer'].includes(ev.id)) {
      weight *= 1.5;
    }
    if (mode.eventWeights?.[ev.id]) {
      weight *= mode.eventWeights[ev.id];
    }
    return { event: ev, weight };
  });

  const total = weighted.reduce((s, i) => s + i.weight, 0);
  let roll = rnd(0, total);
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.event;
  }
  return weighted[0].event;
}

function actionImpact(state, actionId, event, mode) {
  const d = state.difficulty;
  const s = state.stats;
  const impact = { sleepiness: 0, suspicion: 0, stress: 0, knowledge: 0, score: 0, fail: false, msg: '' };

  const knowledgePower = 0.75 * mode.knowledgeEffectiveness;
  const stressPower = clamp(1.1 - (mode.knowledgeEffectiveness - 1) * 0.35, 0.4, 1.1);
  const goodAnswerChance = clamp((s.knowledge * knowledgePower + (100 - s.stress) * 0.25 * stressPower) / 100, 0.05, 0.97);
  const excuseChance = clamp((100 - s.suspicion) / 120, 0.08, 0.9);

  switch (actionId) {
    case 'listen':
      impact.knowledge += 4;
      impact.sleepiness -= 3;
      impact.stress -= 1;
      impact.score += 4;
      impact.msg = 'Ты слушаешь и вникаешь.';
      break;
    case 'pretend':
      impact.suspicion -= 3;
      impact.stress += 1;
      impact.score += 2;
      impact.msg = 'Вид очень занятого человека сработал.';
      break;
    case 'phone':
      impact.sleepiness -= 2;
      impact.suspicion += 7 * d * mode.suspicionPenaltyScale;
      impact.knowledge -= 2;
      impact.score += 3;
      impact.msg = 'Лента мемов мощная, но учитель не слепой.';
      break;
    case 'cheat':
      impact.knowledge += 3;
      impact.suspicion += 5 * d * mode.suspicionPenaltyScale;
      impact.stress += 2;
      impact.score += 6;
      impact.msg = 'Списывание даёт буст, но риск растёт.';
      break;
    case 'answer': {
      const success = Math.random() < goodAnswerChance;
      if (success) {
        impact.knowledge += 4;
        impact.score += 16;
        impact.suspicion -= 4;
        impact.stress -= 3;
        impact.msg = 'Ответ уверенный. Класс в шоке.';
      } else {
        impact.score -= 5;
        impact.stress += 7 * mode.stressPenaltyScale;
        impact.suspicion += 4 * mode.suspicionPenaltyScale;
        impact.msg = 'Ответ вышел так себе.';
        if (event?.important && mode.importantFailEndsRun) impact.fail = true;
      }
      break;
    }
    case 'ignore':
      impact.sleepiness += 3;
      impact.stress += 2 * mode.stressPenaltyScale;
      impact.suspicion += 2 * mode.suspicionPenaltyScale;
      impact.score -= 2;
      impact.msg = 'Игнор это временно удобно, но копит проблемы.';
      break;
    case 'excuse': {
      const success = Math.random() < excuseChance;
      if (success) {
        impact.suspicion -= 7;
        impact.stress -= 2;
        impact.score += 2;
        impact.msg = 'Отмазка звучала убедительно.';
      } else {
        impact.suspicion += 9 * mode.suspicionPenaltyScale;
        impact.stress += 4 * mode.stressPenaltyScale;
        impact.score -= 4;
        impact.msg = 'Отмазка вышла сомнительной.';
        if (event?.important && mode.importantFailEndsRun) impact.fail = true;
      }
      break;
    }
    case 'leave':
      impact.stress -= 8;
      impact.sleepiness -= 4;
      impact.knowledge -= 3;
      impact.suspicion += 2 * mode.suspicionPenaltyScale;
      impact.score += 1;
      impact.msg = 'Перерыв помог прийти в себя.';
      break;
    default:
      break;
  }

  if (event) {
    const matched = event.checks.includes(actionId);
    if (!matched) {
      impact.stress += 5 * mode.stressPenaltyScale;
      impact.suspicion += 4 * mode.suspicionPenaltyScale;
      impact.score -= 3;
      if (event.important && mode.importantFailEndsRun) impact.fail = true;
    } else {
      impact.score += event.danger === 'высокая' ? 6 : 3;
      if (event.danger === 'высокая') impact.stress -= 2;
    }

    if (event.id === 'phone_message' && actionId === 'phone') {
      impact.sleepiness -= 4;
      impact.suspicion += 3;
    }
    if (event.id === 'sleep_attack' && actionId === 'ignore') {
      impact.sleepiness += 6;
    }
    if (event.id === 'mini_test' && actionId === 'cheat') {
      impact.score += 10;
      if (Math.random() < 0.33 * d) {
        impact.suspicion += 16 * mode.suspicionPenaltyScale;
        impact.fail = true;
      }
    }
  }

  return impact;
}

function applyDelta(state, delta) {
  state.stats.sleepiness = clamp(state.stats.sleepiness + delta.sleepiness, 0, 100);
  state.stats.suspicion = clamp(state.stats.suspicion + delta.suspicion, 0, 100);
  state.stats.stress = clamp(state.stats.stress + delta.stress, 0, 100);
  state.stats.knowledge = clamp(state.stats.knowledge + delta.knowledge, 0, 100);
  state.stats.score = Math.max(0, Math.round(state.stats.score + delta.score));
}

function checkLose(state) {
  if (state.stats.suspicion >= 100) return LOSS_REASON.suspicion;
  if (state.stats.sleepiness >= 100) return LOSS_REASON.sleepiness;
  if (state.stats.stress >= 100) return LOSS_REASON.stress;
  return null;
}

export function stepTime(state) {
  const mode = MODES[state.modeId];
  if (!state.running || state.ended) return state;

  state.elapsedSec += 1;
  state.difficulty = calcDifficulty(state.elapsedSec, mode);

  for (const [key, base] of Object.entries(mode.baseDrift)) {
    const dir = ['knowledge'].includes(key) ? 1 : 1;
    const scaled = base * state.difficulty * dir;
    state.stats[key] = clamp(state.stats[key] + scaled, 0, 100);
  }
  state.stats.score = Math.max(
    0,
    Math.round(state.stats.score + (mode.scorePerSecond + state.stats.knowledge / mode.knowledgeScoreFactor))
  );

  if (mode.durationSec) {
    state.timeLeftSec = Math.max(0, mode.durationSec - state.elapsedSec);
  }

  state.nextEventInSec -= 1;
  if (state.nextEventInSec <= 0 && !state.activeEvent) {
    state.activeEvent = sampleEvent(state, mode);
    state.eventHistory.push(state.activeEvent.id);
    pushLog(state, `Событие: ${state.activeEvent.title}`);
    const [minGap, maxGap] = mode.eventEverySec;
    state.nextEventInSec = randomInt(minGap, maxGap);
  }

  const lose = checkLose(state);
  if (lose) {
    state.running = false;
    state.ended = true;
    state.endType = mode.durationSec ? RUN_END_TYPE.LOSE : RUN_END_TYPE.ENDLESS_RECORD;
    state.endReason = lose;
    state.win = false;
    return state;
  }

  if (mode.durationSec && state.timeLeftSec <= 0) {
    state.running = false;
    state.ended = true;
    state.win = true;
    state.endType = RUN_END_TYPE.TIME_WIN;
    state.endReason = mode.resultWinText;
    state.stats.score = Math.round(state.stats.score + mode.survivalBonus);
    pushLog(state, `Финишный бонус: +${mode.survivalBonus} очков за выживание.`);
  }

  return state;
}

export function performAction(state, actionId) {
  if (!ACTIONS.find((a) => a.id === actionId) || state.ended || !state.running) return state;

  const mode = MODES[state.modeId];
  const delta = actionImpact(state, actionId, state.activeEvent, mode);
  applyDelta(state, delta);

  if (delta.fail) {
    state.running = false;
    state.ended = true;
    state.endType = mode.durationSec ? RUN_END_TYPE.LOSE : RUN_END_TYPE.ENDLESS_RECORD;
    state.win = false;
    state.endReason = LOSS_REASON.eventFail;
    state.failedEventId = state.activeEvent?.id ?? null;
    state.failedEventTitle = state.activeEvent?.title ?? '';
  }

  pushLog(state, `${ACTIONS.find((a) => a.id === actionId).label}: ${delta.msg}`);

  state.activeEvent = null;

  const lose = checkLose(state);
  if (lose) {
    state.running = false;
    state.ended = true;
    state.endType = mode.durationSec ? RUN_END_TYPE.LOSE : RUN_END_TYPE.ENDLESS_RECORD;
    state.endReason = lose;
    state.win = false;
  }

  if (!mode.durationSec && state.elapsedSec > 0 && state.elapsedSec % 75 === 0) {
    state.stats.score += 30;
    pushLog(state, 'Ты выжил очередной длинный отрезок. Бонус +30 очков.');
  }

  return state;
}


export function applySecondChance(state) {
  state.running = true;
  state.ended = false;
  state.win = false;
  state.endType = null;
  state.endReason = '';
  state.continueUsed = true;
  state.activeEvent = null;
  state.failedEventId = null;
  state.failedEventTitle = '';
  state.stats.sleepiness = Math.min(state.stats.sleepiness, 70);
  state.stats.stress = Math.min(state.stats.stress, 70);
  state.stats.suspicion = Math.min(state.stats.suspicion, 70);
  pushLog(state, 'Бонус за просмотр рекламы: ты собрался и вернулся в игру.');
  return state;
}

export function formatTime(totalSec) {
  if (totalSec == null) return '∞';
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}
