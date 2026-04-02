export const APP_VERSION = '1.1.0';

export const STATS = {
  sleepiness: { label: 'Сонливость', type: 'negative', loseAt: 100 },
  suspicion: { label: 'Подозрение учителя', type: 'negative', loseAt: 100 },
  stress: { label: 'Стресс', type: 'negative', loseAt: 100 },
  knowledge: { label: 'Знания', type: 'positive', loseAt: null },
  score: { label: 'Очки', type: 'score', loseAt: null },
};

export const MODES = {
  normal: {
    id: 'normal',
    title: 'Обычный урок',
    durationSec: 180,
    tickMs: 1000,
    baseDrift: { sleepiness: 1.1, stress: 0.8, suspicion: 0.2, knowledge: 0.1 },
    eventEverySec: [7, 11],
    difficultyScale: 1,
    unlockScore: 0,
  },
  test: {
    id: 'test',
    title: 'Контрольная',
    durationSec: 150,
    tickMs: 1000,
    baseDrift: { sleepiness: 1.0, stress: 1.3, suspicion: 0.25, knowledge: 0.08 },
    eventEverySec: [6, 9],
    difficultyScale: 1.25,
    unlockScore: 220,
  },
  endless: {
    id: 'endless',
    title: 'Бесконечный режим',
    durationSec: null,
    tickMs: 1000,
    baseDrift: { sleepiness: 1.3, stress: 1.1, suspicion: 0.28, knowledge: 0.09 },
    eventEverySec: [5, 8],
    difficultyScale: 1.35,
    unlockScore: 420,
  },
};

export const ACTIONS = [
  { id: 'listen', label: 'Слушать' },
  { id: 'pretend', label: 'Делать вид, что работаешь' },
  { id: 'phone', label: 'Сидеть в телефоне' },
  { id: 'cheat', label: 'Списывать' },
  { id: 'answer', label: 'Отвечать' },
  { id: 'ignore', label: 'Игнорировать' },
  { id: 'excuse', label: 'Отмазаться' },
  { id: 'leave', label: 'Попроситься выйти' },
];

export const LOSS_REASON = {
  suspicion: 'Учитель раскусил тебя. Конец маскировки.',
  sleepiness: 'Ты уснул прямо на уроке. Поражение.',
  stress: 'Нервы не выдержали, и ты сдался.',
  eventFail: 'Ты провалил ключевое событие.',
};
