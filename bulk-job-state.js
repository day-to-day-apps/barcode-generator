const PREFIX = 'barcode-bulk:v1:';
const PRESET_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function encodeBulkJobState({ preset } = {}) {
  const value = typeof preset === 'string' ? preset.trim() : '';
  if (!PRESET_PATTERN.test(value)) return PREFIX + '{}';
  return PREFIX + JSON.stringify({ preset: value });
}

export function decodeBulkJobState(notes, allowedPresets = []) {
  if (typeof notes !== 'string' || !notes.startsWith(PREFIX)) return null;
  try {
    const state = JSON.parse(notes.slice(PREFIX.length));
    if (!PRESET_PATTERN.test(state?.preset || '')) return null;
    if (allowedPresets.length && !allowedPresets.includes(state.preset)) return null;
    return { preset: state.preset };
  } catch {
    return null;
  }
}
