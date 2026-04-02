const KEY = 'survive-lesson-save-v1';

const defaultSave = {
  bestScore: 0,
  bestTestScore: 0,
  unlockedModes: ['normal'],
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultSave };
    const parsed = JSON.parse(raw);
    return {
      bestScore: Number(parsed.bestScore) || 0,
      bestTestScore: Number(parsed.bestTestScore) || 0,
      unlockedModes: Array.isArray(parsed.unlockedModes)
        ? [...new Set(['normal', ...parsed.unlockedModes])]
        : ['normal'],
    };
  } catch {
    return { ...defaultSave };
  }
}

export function saveProgress(progress) {
  const payload = {
    bestScore: progress.bestScore,
    bestTestScore: progress.bestTestScore,
    unlockedModes: progress.unlockedModes,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}
