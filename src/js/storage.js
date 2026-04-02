const STORAGE_KEY = 'survive-lesson-save-v2';

export const SAVE_VERSION = 3;

const defaultSave = {
  version: SAVE_VERSION,
  bestScore: 0,
  bestTestScore: 0,
  tutorialShown: false,
  unlockedModes: ['normal'],
  stats: {
    runs: 0,
    wins: 0,
    losses: 0,
  },
  settings: {
    musicMuted: true,
    sfxMuted: true,
  },
};

function normalizeSave(payload = {}) {
  const unlockedModes = Array.isArray(payload.unlockedModes) ? payload.unlockedModes : ['normal'];
  return {
    version: SAVE_VERSION,
    bestScore: Number(payload.bestScore) || 0,
    bestTestScore: Number(payload.bestTestScore) || 0,
    tutorialShown: payload.tutorialShown === true,
    unlockedModes: [...new Set(['normal', ...unlockedModes])],
    stats: {
      runs: Number(payload.stats?.runs) || 0,
      wins: Number(payload.stats?.wins) || 0,
      losses: Number(payload.stats?.losses) || 0,
    },
    settings: {
      musicMuted: Boolean(payload.settings?.musicMuted ?? true),
      sfxMuted: Boolean(payload.settings?.sfxMuted ?? true),
    },
  };
}

function parseRaw(raw) {
  if (!raw) return { ...defaultSave };

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return { ...defaultSave };
    }

    if (parsed.version === SAVE_VERSION) {
      return normalizeSave(parsed);
    }

    return normalizeSave({
      ...defaultSave,
      ...parsed,
      version: SAVE_VERSION,
      stats: {
        ...defaultSave.stats,
        ...parsed.stats,
      },
      settings: {
        ...defaultSave.settings,
        ...parsed.settings,
      },
    });
  } catch {
    return { ...defaultSave };
  }
}

export function createLocalStorageService() {
  return {
    load() {
      const raw = localStorage.getItem(STORAGE_KEY);
      return parseRaw(raw);
    },
    save(nextState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSave(nextState)));
    },
    merge(localSave, cloudSave) {
      const local = normalizeSave(localSave);
      const cloud = normalizeSave(cloudSave);

      return {
        ...local,
        bestScore: Math.max(local.bestScore, cloud.bestScore),
        bestTestScore: Math.max(local.bestTestScore, cloud.bestTestScore),
        tutorialShown: local.tutorialShown || cloud.tutorialShown,
        unlockedModes: [...new Set([...local.unlockedModes, ...cloud.unlockedModes])],
        stats: {
          runs: Math.max(local.stats.runs, cloud.stats.runs),
          wins: Math.max(local.stats.wins, cloud.stats.wins),
          losses: Math.max(local.stats.losses, cloud.stats.losses),
        },
        settings: {
          ...cloud.settings,
        },
      };
    },
  };
}

export function getDefaultSave() {
  return { ...defaultSave };
}
