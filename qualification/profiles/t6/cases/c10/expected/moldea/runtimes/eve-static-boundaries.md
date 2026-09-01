# Eve static boundaries

The adapter proves direct TypeScript `defineAgent`, `defineTool`, and `defineSkill` modules in supported filesystem slots. Recursive tool paths flatten to hyphenated runtime names, path segments must match Eve's supported grammar, and `Workflow` remains reserved.

Dynamic tools, flat or packaged Markdown skills, single-file subagents, case-varied or legacy instruction files, instruction directories, remote agents, extensions, connections, framework tools, and filesystem collisions remain outside positive static evidence. Use one collision-free static TypeScript module, one exact `instructions.md` or `instructions.ts` source, and a directory-backed `subagents/<name>/agent.ts` agent when the relationship must be canonical. Otherwise, retain an explicit unresolved boundary and prove runtime behavior with focused integration evidence.

Eve 0.39.1 applications require Node.js 24 or newer. This operational prerequisite does not establish an agent relationship.
