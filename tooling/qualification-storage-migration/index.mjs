import { migrateQualificationStorage } from './migrate.mjs';

const result = await migrateQualificationStorage();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
