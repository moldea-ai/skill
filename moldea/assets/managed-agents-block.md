<!-- moldea:start -->

This project uses moldea for project context. Explicit moldea operations and direct agent, skill, or project-context work follow the skill's own routing. For other repository planning, implementation, or review, once you know the involved files and before editing or giving conclusions, run:

node "<repo-root>/{{skill-path}}/scripts/relevance-gate.mjs" --repository "<repo-root>" --path "<file>" [--path "<file>" ...]

<repo-root> is the absolute repository root. Pass file paths relative to that root, even from a subdirectory. Use only already-known paths; do not scan or run Git for this. With no known paths, skip this precheck.

- Output 1: read <repo-root>/{{skill-path}}/SKILL.md; retain the checked paths and result.
- Output 0 or an error: continue without moldea and do not mention it.

If the task involves new files later, check only that new batch once before acting. Reuse unchanged results.
<!-- moldea:end -->
