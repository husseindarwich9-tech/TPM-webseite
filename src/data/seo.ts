import { firma } from './firma';

export interface Crumb {
  href: string;
  label: string;
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ href: '/', label: 'Start' }, ...crumbs].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${firma.url}${c.href}`,
    })),
  };
}
