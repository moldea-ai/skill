// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createWebsiteModel } from './generation.ts';
import {
  INSTALL_COMMAND,
  REQUIRED_DOCUMENT_ROUTES,
  SKILLS_DIRECTORY_URL,
} from '../model/constants.ts';

describe('createWebsiteModel', () => {
  test('derives one complete public model from canonical sources', () => {
    const model = createWebsiteModel();

    expect(model.skill.name).toBe('moldea');
    expect(model.skill.version).toBe('3.0.0');
    expect(model.skill.description.length).toBeGreaterThan(0);
    expect(new Set(model.routes).size).toBe(model.routes.length);
    expect(model.documents.length).toBeGreaterThanOrEqual(18);
    expect(model.searchRecords.length).toBeGreaterThan(model.documents.length);
    expect(model.navigation.flatMap(({ documents }) => documents)).toStrictEqual(model.documents);
    expect(model.qualification.route).toBe('/qualification/');
    expect(model.qualification.profiles).toHaveLength(1);
    const qualificationProfile = model.qualification.profiles[0];
    expect(qualificationProfile).toMatchObject({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    expect(qualificationProfile?.attempts.length).toBeGreaterThan(0);
    expect(qualificationProfile?.latest).not.toBeNull();

    for (const route of REQUIRED_DOCUMENT_ROUTES) expect(model.routes).toContain(route);
    for (const document of model.documents) {
      expect(model.routes).toContain(document.route);
      expect(model.searchRecords.some(({ route }) => route === document.route)).toBe(true);
      expect(model.llmsText).toContain(`- [${document.title}](${document.route})`);
    }
    for (const profile of model.qualification.profiles) {
      expect(model.routes).toContain(profile.route);
      expect(model.searchRecords.some(({ route }) => route === profile.route)).toBe(true);
      expect(model.llmsText).toContain(`- [${profile.title}](${profile.route})`);
    }
    expect(model.routes).toContain('/qualification/');
    expect(model.searchRecords.some(({ route }) => route === '/qualification/')).toBe(true);
  });

  test('keeps distribution and product-name presentation in generated LLM guidance', () => {
    const model = createWebsiteModel();

    expect(model.llmsText).toContain('# `moldea` Agent Skill');
    expect(model.llmsText).toContain('reusable Agent Skills');
    expect(model.llmsText).toContain(SKILLS_DIRECTORY_URL);
    expect(model.llmsText).toContain(INSTALL_COMMAND);
    expect(model.llmsText).toContain('## Adapter qualification');
  });

  test('requires reader-facing product mentions in Markdown to use inline code', () => {
    const model = createWebsiteModel();

    for (const document of model.documents) {
      const readerFacingText = document.markdown
        .replaceAll(/```[\s\S]*?```/g, '')
        .replaceAll(/\]\([^)]+\)/g, ']()')
        .replaceAll(/`[^`]+`/g, '');

      expect(readerFacingText, document.sourcePath).not.toMatch(/\bmoldea\b/iu);
      expect(document.title).not.toMatch(/\bmoldea\b/iu);
      expect(document.description).not.toMatch(/\bmoldea\b/iu);
      expect(document.navigationTitle).not.toMatch(/\bmoldea\b/iu);
    }
  });
});
