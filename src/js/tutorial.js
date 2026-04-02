export const TUTORIAL_STEPS = [
  {
    id: 'goal',
    screen: 'start',
    target: '#start-screen .hero',
    title: 'Переживи урок',
    text: 'Твоя цель проста: дотянуть до звонка, не сорваться и не вызвать слишком много подозрений.',
  },
  {
    id: 'stats',
    screen: 'game',
    target: '#stats',
    title: 'Следи за параметрами',
    text: 'Сонливость, стресс и подозрение опасны. Знания помогают отвечать увереннее и держать темп.',
  },
  {
    id: 'events',
    screen: 'game',
    target: '#event-panel',
    title: 'Реагируй на события',
    text: 'Урок постоянно подкидывает ситуации. Чем выше опасность события, тем больнее ошибка.',
  },
  {
    id: 'actions',
    screen: 'game',
    target: '#actions-grid',
    title: 'Выбирай действия с умом',
    text: 'Каждая кнопка меняет параметры по-своему. Полностью безопасного действия здесь нет.',
  },
  {
    id: 'lose',
    screen: 'game',
    target: '#stats',
    title: 'Когда наступает поражение',
    text: 'Если сонливость, стресс или подозрение доходят до 100, забег заканчивается. Провал важного события тоже может добить тебя сразу.',
  },
];

export function getTutorialStep(stepIndex) {
  return TUTORIAL_STEPS[stepIndex] ?? null;
}
