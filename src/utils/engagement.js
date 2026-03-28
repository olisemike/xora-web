export const toCount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string' && value.trim() === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
};

export const formatCount = (value) => {
  const num = toCount(value);
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(num);
};
