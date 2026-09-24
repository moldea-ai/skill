// src/portable/repository-files.ts
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
var isPathWithin = (trustedRoot, candidatePath) => {
  const path = relative(trustedRoot, candidatePath);
  return path === "" || !path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path);
};
var resolveRepositoryFile = async (repositoryRoot, filePath, maximumBytes, directoryLinks = "allow") => {
  if (directoryLinks === "reject") {
    if (!isPathWithin(repositoryRoot, filePath)) {
      throw new Error("Expected a bounded regular file inside the repository.");
    }
    let directoryPath = repositoryRoot;
    for (const component of relative(repositoryRoot, filePath).split(sep).slice(0, -1)) {
      directoryPath = join(directoryPath, component);
      if (!(await lstat(directoryPath)).isDirectory()) {
        throw new Error("Expected a bounded regular file inside the repository.");
      }
    }
  }
  const fileStat = await lstat(filePath);
  const resolvedPath = await realpath(filePath);
  if (!fileStat.isFile() || fileStat.size > maximumBytes || !isPathWithin(repositoryRoot, resolvedPath)) {
    throw new Error("Expected a bounded regular file inside the repository.");
  }
  return resolvedPath;
};
var readRepositoryFile = async (repositoryRoot, filePath, maximumBytes, directoryLinks = "allow") => {
  const resolvedPath = await resolveRepositoryFile(
    repositoryRoot,
    filePath,
    maximumBytes,
    directoryLinks
  );
  const file = await open(resolvedPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maximumBytes) {
      throw new Error("Expected a bounded regular file inside the repository.");
    }
    const chunks = [];
    let total = 0;
    while (total <= maximumBytes) {
      const bytes = Buffer.allocUnsafe(
        Math.min(
          65536,
          total === 0 ? Math.max(1, stat.size + 1) : 65536,
          maximumBytes + 1 - total
        )
      );
      const { bytesRead } = await file.read(bytes, 0, bytes.length, null);
      if (bytesRead === 0) return Buffer.concat(chunks, total);
      total += bytesRead;
      if (total > maximumBytes) break;
      chunks.push(bytes.subarray(0, bytesRead));
    }
    throw new Error("Repository file exceeds its byte limit.");
  } finally {
    await file.close();
  }
};
export {
  isPathWithin,
  readRepositoryFile,
  resolveRepositoryFile
};
