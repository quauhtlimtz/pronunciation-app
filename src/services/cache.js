const CACHE_PREFIX = "pron_v2_";

export function cacheGet(lessonId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lessonId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function cacheSet(lessonId, data) {
  try { localStorage.setItem(CACHE_PREFIX + lessonId, JSON.stringify(data)); } catch {}
}

export function cacheClear(lessonId) {
  try { localStorage.removeItem(CACHE_PREFIX + lessonId); } catch {}
}
