export const inSite = (path: string | undefined | null, fallback = '/') =>
  path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback;
