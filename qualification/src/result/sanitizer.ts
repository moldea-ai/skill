import path from 'node:path';

export type ISanitizationContext = {
  packagesRepository: string;
  skillRepository: string;
  workspaceDirectory?: string;
};

const replaceAllLiteral = (source: string, literal: string, replacement: string): string =>
  literal === '' ? source : source.split(literal).join(replacement);

/** Removes host-specific paths and recognizable credential forms from committed text evidence. */
export const sanitizeEvidenceText = (source: string, context: ISanitizationContext): string => {
  let sanitized = source;
  const replacements: ReadonlyArray<readonly [string | undefined, string]> = [
    [context.workspaceDirectory, '<workspace>'],
    [context.skillRepository, '<skill-repository>'],
    [context.packagesRepository, '<packages-repository>'],
    [process.env['HOME'], '<home>'],
  ];

  for (const [literal, replacement] of replacements) {
    if (literal !== undefined) {
      sanitized = replaceAllLiteral(sanitized, path.resolve(literal), replacement);
    }
  }

  return sanitized
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/gu, '<redacted-token>')
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gu, '<redacted-private-key>')
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gu, '$1<redacted-credentials>@');
};

const sanitizeUnknownEvidenceValue = (source: unknown, context: ISanitizationContext): unknown => {
  if (typeof source === 'string') {
    return sanitizeEvidenceText(source, context);
  }

  if (Array.isArray(source)) {
    return source.map((entry) => sanitizeUnknownEvidenceValue(entry, context));
  }

  if (typeof source === 'object' && source !== null) {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        sanitizeUnknownEvidenceValue(value, context),
      ]),
    );
  }

  return source;
};

/** Sanitizes every string in a JSON-compatible evidence value without changing its shape. */
export const sanitizeEvidenceValue = <TValue>(
  source: TValue,
  context: ISanitizationContext,
): TValue => sanitizeUnknownEvidenceValue(source, context) as TValue;
