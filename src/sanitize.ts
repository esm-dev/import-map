export function sanitizeStringMap(map: unknown): Record<string, string> {
  if (!isObject(map)) {
    return {};
  }
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "string") {
      next[key] = value;
    }
  }
  return next;
}

export function sanitizeScopes(scopes: unknown): Record<string, Record<string, string>> {
  if (!isObject(scopes)) {
    return {};
  }
  const next: Record<string, Record<string, string>> = {};
  for (const [scopeKey, scopeImports] of Object.entries(scopes)) {
    if (isObject(scopeImports)) {
      next[scopeKey] = sanitizeStringMap(scopeImports);
    }
  }
  return next;
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
