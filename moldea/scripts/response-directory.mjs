#!/usr/bin/env node

// src/portable/response-directory/entry.ts
import { parseArgs } from "node:util";

// src/portable/response-directory/response-directory.ts
import { chmod, lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { isPathWithin } from "./repository-files.mjs";
var createResponseDirectory = async (repositoryRoot) => {
  if (!isAbsolute(repositoryRoot)) throw new Error("An absolute repository root is required.");
  const root = await realpath(repositoryRoot);
  if (!(await lstat(root)).isDirectory()) throw new Error("A repository directory is required.");
  const temporaryRoot = await realpath(tmpdir());
  if (isPathWithin(root, temporaryRoot))
    throw new Error("The host temporary root must be outside the repository.");
  const directory = await mkdtemp(join(temporaryRoot, "moldea-response-"));
  try {
    if (process.platform !== "win32") await chmod(directory, 448);
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
};

// src/portable/response-directory/entry.ts
try {
  const { values } = parseArgs({ options: { repository: { type: "string" } } });
  if (values.repository === void 0) throw new Error("--repository is required.");
  process.stdout.write(`${await createResponseDirectory(values.repository)}
`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Response directory unavailable."}
`
  );
  process.exitCode = 1;
}
