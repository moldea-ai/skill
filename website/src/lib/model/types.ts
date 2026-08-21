import type { IQualificationWebsiteModel } from '../qualification/index.ts';

import type { DOCUMENT_SECTION_LABELS } from './constants.ts';

// public documentation section identifiers
export type IDocumentSection = keyof typeof DOCUMENT_SECTION_LABELS;

// one repository-owned Markdown document and its public route
export interface IWebsiteDocument {
  description: string;
  markdown: string;
  navigationTitle: string;
  order: number;
  route: string;
  section: IDocumentSection;
  slug: string;
  sourcePath: string;
  title: string;
}

// one navigation group derived from document frontmatter
export interface INavigationGroup {
  documents: IWebsiteDocument[];
  id: IDocumentSection;
  label: string;
}

// portable skill identity derived from SKILL.md frontmatter
export interface ISkillMetadata {
  description: string;
  name: string;
  version: string;
}

// public search record derived from canonical documentation
export interface ISearchRecord {
  description: string;
  route: string;
  searchText: string;
  title: string;
}

// deterministic website model consumed by static routes
export interface IWebsiteModel {
  documents: IWebsiteDocument[];
  generatedNotice: string;
  llmsText: string;
  navigation: INavigationGroup[];
  qualification: IQualificationWebsiteModel;
  routes: string[];
  searchRecords: ISearchRecord[];
  skill: ISkillMetadata;
}
