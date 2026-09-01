import path from 'node:path';

export type ISanitizationContext = {
  attemptDirectory?: string;
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
    [context.attemptDirectory, '<attempt>'],
    [context.skillRepository, '<skill-repository>'],
    [context.packagesRepository, '<packages-repository>'],
    [process.env['HOME'], '<home>'],
    ['/home/evaluator', '<sandbox-home>'],
    ['/mnt', '<workspace>'],
  ];

  for (const [literal, replacement] of replacements) {
    if (literal !== undefined) {
      sanitized = replaceAllLiteral(sanitized, path.resolve(literal), replacement);
    }
  }

  return sanitized
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/gu, '<redacted-token>')
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gu,
      '<redacted-token>',
    )
    .replace(/\b(?:npm_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/gu, '<redacted-token>')
    .replace(/\bAKIA[A-Z0-9]{16}\b/gu, '<redacted-access-key>')
    .replace(
      /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}(?=$|[\s"',;])/giu,
      '$1 <redacted-credential>',
    )
    .replace(
      /\b([A-Z][A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|SECRET))=([^\s]+)/gu,
      '$1=<redacted-credential>',
    )
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gu, '<redacted-private-key>')
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gu, '$1<redacted-credentials>@');
};

const isSensitiveFieldName = (fieldName: string): boolean => {
  const normalizedFieldName = fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();

  return (
    ['authorization', 'credentials', 'password', 'privatekey', 'secret', 'token'].some(
      (suffix) => normalizedFieldName === suffix || normalizedFieldName.endsWith(suffix),
    ) || normalizedFieldName.endsWith('apikey')
  );
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
        isSensitiveFieldName(key) && value !== null
          ? '<redacted-credential>'
          : sanitizeUnknownEvidenceValue(value, context),
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
