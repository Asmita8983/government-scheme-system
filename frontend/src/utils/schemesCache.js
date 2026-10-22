const CACHE_KEY = "gov_schemes_eligibility_cache";
const CACHE_TTL_MS = 60 * 1000;

export function getProfileCacheKey(user) {
  const profile = user?.profile || {};
  return JSON.stringify({
    id: user?._id || "guest",
    age: profile.age,
    gender: profile.gender,
    income: profile.income,
    category: profile.category,
    education: profile.education,
    occupation: profile.occupation,
    state: profile.state,
    district: profile.district,
  });
}

export function getCachedSchemes(user) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.profileKey !== getProfileCacheKey(user)) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.schemes;
  } catch {
    return null;
  }
}

export function setCachedSchemes(user, schemes) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        profileKey: getProfileCacheKey(user),
        schemes,
        timestamp: Date.now(),
      })
    );
  } catch {
    /* ignore quota errors */
  }
}

export function clearSchemesCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
