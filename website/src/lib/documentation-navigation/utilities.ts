import type { IWebsiteDocument } from '../model/types.ts';

/**
 * Creates the canonical breadcrumb hierarchy for documentation and example routes.
 * @param document Validated documentation identity.
 * @returns Logical public routes for visible and structured breadcrumbs.
 */
export const createDocumentationBreadcrumbs = (
  document: Pick<IWebsiteDocument, 'route' | 'section' | 'title'>,
) => {
  const home = { href: '/', label: 'Home' };

  if (document.route === '/docs/') return [home, { label: document.title }];

  if (document.section !== 'examples') {
    return [home, { href: '/docs/', label: 'Docs' }, { label: document.title }];
  }

  if (document.route === '/examples/') {
    return [home, { href: '/docs/', label: 'Docs' }, { label: document.title }];
  }

  return [
    home,
    { href: '/docs/', label: 'Docs' },
    { href: '/examples/', label: 'Examples' },
    { label: document.title },
  ];
};
