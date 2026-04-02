export function icon(symbolId, className = '') {
  const classes = ['ui-icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${symbolId}"></use></svg>`;
}
