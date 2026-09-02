#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const START_MESSAGE_TYPE = 'start-semantic-evaluation';

let hasStarted = false;

const stopAfterParentExit = () => {
  if (!hasStarted) {
    process.exit(1);
    return;
  }

  process.kill(process.pid, 'SIGTERM');
};

process.on('disconnect', stopAfterParentExit);

const startMessage = await new Promise((resolveStart) => {
  process.once('message', resolveStart);
});
if (
  startMessage === null ||
  typeof startMessage !== 'object' ||
  Array.isArray(startMessage) ||
  Object.keys(startMessage).length !== 1 ||
  startMessage.type !== START_MESSAGE_TYPE
) {
  throw new Error('Semantic evaluation child received an invalid start message.');
}

const [runnerPath, ...runnerArguments] = process.argv.slice(2);
if (typeof runnerPath !== 'string' || runnerPath.length === 0) {
  throw new Error('Semantic evaluation child requires an exact runner path.');
}

hasStarted = true;
process.channel?.unref();
process.argv = [process.execPath, runnerPath, ...runnerArguments];
await import(pathToFileURL(runnerPath).href);
