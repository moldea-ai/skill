import { relative, sep } from 'node:path';

/** Resolves a generated HTML artifact to its public route. */
export const getLogicalPagePath = (distDirectory: string, htmlPath: string): string => {
  const relativeHtmlPath = relative(distDirectory, htmlPath).replaceAll(sep, '/');

  if (relativeHtmlPath === 'index.html') return '/';
  if (relativeHtmlPath === '404.html') return '/404.html';

  return `/${relativeHtmlPath.replace(/index\.html$/u, '')}`;
};
