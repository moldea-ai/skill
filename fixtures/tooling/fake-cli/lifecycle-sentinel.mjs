import { appendFileSync } from 'node:fs';

const sentinelPath = process.env.MOLDEA_LIFECYCLE_SENTINEL;

if (!sentinelPath) {
  throw new Error('MOLDEA_LIFECYCLE_SENTINEL is required.');
}

appendFileSync(sentinelPath, JSON.stringify(process.argv[2] ?? 'unknown') + '\n');
