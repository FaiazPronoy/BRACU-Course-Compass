// only follow links that stay on this site: "/forum/123" yes, "//evil.com" or "/\evil.com" no
export const inSite = (path: string | undefined | null, fallback = '/') =>
  path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback;
