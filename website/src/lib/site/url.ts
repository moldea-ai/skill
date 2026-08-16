// established public deployment defaults for local builds and non-deploying CI
export const DEFAULT_SITE_URL = 'https://skill.moldea.ai';
export const DEFAULT_BASE_PATH = '/';

/**
 * Returns one normalized root-relative base path with a trailing slash.
 * @param basePath Candidate public base path.
 * @returns The normalized public base path.
 * @throws
 * - If the website base path contains unsupported URL characters
 */
export const normalizeBasePath = (basePath: string): string => {
  const path = `/${basePath}`.replaceAll(/\/{2,}/g, '/');
  const normalizedPath = path === '/' ? '/' : `${path.replace(/\/$/, '')}/`;

  if (!/^\/(?:[a-zA-Z0-9._~-]+\/)*$/u.test(normalizedPath)) {
    throw new Error('The website base path contains unsupported URL characters.');
  }

  return normalizedPath;
};

/**
 * Prefixes one root-relative public route with the configured deployment base.
 * @param route Root-relative public route.
 * @param basePath Configured public base path.
 * @returns The base-aware route.
 */
export const withBase = (route: string, basePath = import.meta.env.BASE_URL): string => {
  const base = normalizeBasePath(basePath);
  const routeWithoutRoot = route.replace(/^\//, '');

  return `${base}${routeWithoutRoot}`.replaceAll(/\/{2,}/g, '/');
};

/**
 * Checks whether a public pathname identifies a route or one of its descendants.
 * @param pathname Current public pathname.
 * @param route Root-relative public route.
 * @param basePath Configured public base path.
 * @returns Whether the route is active for the current pathname.
 */
export const isPublicRouteActive = (
  pathname: string,
  route: string,
  basePath = import.meta.env.BASE_URL,
): boolean => {
  const publicRoute = withBase(route, basePath);

  return publicRoute === normalizeBasePath(basePath)
    ? pathname === publicRoute
    : pathname.startsWith(publicRoute);
};

/**
 * Builds a canonical absolute URL from an origin, base path, and public route.
 * @param route Root-relative public route.
 * @param siteUrl Public website origin.
 * @param basePath Public deployment base path.
 * @returns The canonical absolute URL.
 */
export const createCanonicalUrl = (route: string, siteUrl: string, basePath: string): string =>
  new URL(withBase(route, basePath), siteUrl).href;
