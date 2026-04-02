import { STATS } from './config.js';

const PRIMARY_LIMIT = 100;
const WARNING_LIMIT = 80;
const DANGER_KEYS = ['sleepiness', 'stress', 'suspicion'];

const FACTOR_META = {
  sleepiness: {
    icon: 'i-sleepiness',
    tone: 'sleepiness',
    title: 'Сонливость стала критической',
    text: 'Герой отключился раньше звонка и потерял контроль над ситуацией.',
  },
  stress: {
    icon: 'i-stress',
    tone: 'stress',
    title: 'Стресс вышел из-под контроля',
    text: 'Давление стало слишком сильным, и персонаж сорвался.',
  },
  suspicion: {
    icon: 'i-suspicion',
    tone: 'suspicion',
    title: 'Подозрение учителя стало критическим',
    text: 'Слишком много рискованных действий убедили учителя, что что-то не так.',
  },
  event: {
    icon: 'i-event-fail',
    tone: 'event',
    title: 'Провалено важное событие',
    text: 'Ключевой момент урока закончился неудачно и оборвал забег.',
  },
  combo: {
    icon: 'i-result-combo',
    tone: 'combo',
    title: 'Сразу несколько параметров сорвались',
    text: 'К концу урока накопилось слишком много проблем одновременно.',
  },
};

function roundValue(value) {
  return Math.max(0, Math.round(value));
}

function getDangerStats(state) {
  return DANGER_KEYS.map((key) => ({
    key,
    label: STATS[key].label,
    value: roundValue(state.stats[key]),
  })).sort((left, right) => right.value - left.value);
}

function metricText(stat) {
  return `${stat.label}: ${stat.value}/100`;
}

function buildStatReason(stat) {
  const meta = FACTOR_META[stat.key];
  return {
    type: stat.key,
    icon: meta.icon,
    tone: meta.tone,
    title: meta.title,
    text: meta.text,
    metric: metricText(stat),
    usedKeys: [stat.key],
  };
}

function buildComboReason(stats) {
  const topStats = stats.slice(0, 2);
  return {
    type: 'combo',
    icon: FACTOR_META.combo.icon,
    tone: FACTOR_META.combo.tone,
    title: FACTOR_META.combo.title,
    text: FACTOR_META.combo.text,
    metric: topStats.map(metricText).join(' • '),
    usedKeys: topStats.map((stat) => stat.key),
  };
}

function buildEventReason(state) {
  return {
    type: 'event',
    icon: FACTOR_META.event.icon,
    tone: FACTOR_META.event.tone,
    title: FACTOR_META.event.title,
    text: state.failedEventTitle
      ? `${FACTOR_META.event.text} Срыв произошел на событии «${state.failedEventTitle}».`
      : FACTOR_META.event.text,
    metric: state.failedEventTitle ? `Событие: ${state.failedEventTitle}` : 'Ключевое событие было провалено',
    usedKeys: ['event'],
  };
}

function pickPrimaryReason(state, stats) {
  const criticalStats = stats.filter((stat) => stat.value >= PRIMARY_LIMIT);
  const overloadedStats = stats.filter((stat) => stat.value >= 95);

  if (criticalStats.length >= 2 || (criticalStats.length === 1 && overloadedStats.length >= 2)) {
    return buildComboReason(criticalStats.length >= 2 ? criticalStats : overloadedStats);
  }

  if (criticalStats.length === 1) {
    return buildStatReason(criticalStats[0]);
  }

  if (state.failedEventId) {
    return buildEventReason(state);
  }

  const warningStats = stats.filter((stat) => stat.value >= WARNING_LIMIT);
  if (warningStats.length >= 2) {
    return buildComboReason(warningStats);
  }

  if (warningStats.length === 1) {
    return buildStatReason(warningStats[0]);
  }

  return buildStatReason(stats[0]);
}

function buildSecondaryFactors(state, stats, primaryReason) {
  const secondary = [];

  if (state.failedEventId && !primaryReason.usedKeys.includes('event')) {
    secondary.push(`Важное событие было провалено: ${state.failedEventTitle || 'ситуация завершилась неудачей'}`);
  }

  stats
    .filter((stat) => stat.value >= WARNING_LIMIT && !primaryReason.usedKeys.includes(stat.key))
    .slice(0, 2)
    .forEach((stat) => {
      secondary.push(metricText(stat));
    });

  return secondary.slice(0, 2);
}

export function analyzeDefeat(state) {
  const stats = getDangerStats(state);
  const primary = pickPrimaryReason(state, stats);

  return {
    primary,
    secondary: buildSecondaryFactors(state, stats, primary),
  };
}
