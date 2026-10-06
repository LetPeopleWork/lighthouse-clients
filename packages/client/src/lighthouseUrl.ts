/**
 * A Lighthouse URL as the client talks to it: an http(s) origin (scheme and host lower-cased, a default
 * port dropped) with any path kept but no trailing slash; null for anything that is not one.
 */
export const getNormalizedLighthouseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const pathname = parsed.pathname.replace(/\/+$/u, "");
    if (pathname.length === 0 || pathname === "/") {
      return parsed.origin;
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
};
