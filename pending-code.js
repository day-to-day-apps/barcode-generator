import { insertCode } from './db-codes.js';

const COOKIE_NAME = 'bc_pending_code';
const TTL_SECONDS = 86400;

export function rememberPendingCode(payload) {
  try {
    const value = encodeURIComponent(JSON.stringify({ ...payload, ts: Date.now() }));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${TTL_SECONDS}; SameSite=Strict`;
    return true;
  } catch {
    return false;
  }
}

export function readPendingCode() {
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const value = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
    if (!value?.code_type || !value?.value) return null;
    if (Date.now() - Number(value.ts || 0) > TTL_SECONDS * 1000) return null;
    return value;
  } catch {
    return null;
  }
}

export function clearPendingCode() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
}

export async function consumePendingCode(userId) {
  const pending = readPendingCode();
  if (!pending || !userId) return { saved: false, data: null, error: null };
  const { data, error } = await insertCode({
    user_id: userId,
    code_type: pending.code_type,
    value: pending.value,
    name: pending.name || null,
    settings: pending.settings || {},
  });
  if (error) return { saved: false, data: null, error };
  clearPendingCode();
  return { saved: true, data, error: null };
}
