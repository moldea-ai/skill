<!-- moldea:start -->

Loading an invoked skill's entrypoint or supporting instructions is host instruction loading and does not trigger moldea. Before editing or giving conclusions, apply the routes below to independently targeted project inputs, outputs, and implementation paths.

moldea provides project context from the exact repository-local installation. For explicit moldea operations, agent work, project-grounded skill work, changes to what an in-app model decides or says (including inline calls), and project-context work, read <repo-root>/{{skill-path}}/SKILL.md when present. For an explicit moldea operation with no installation, report that it is unavailable. Otherwise continue silently when the file is missing.

For planning that adds or changes product behavior, check that SKILL.md and the relevance gate exist at that installation, then run:

node "<repo-root>/{{skill-path}}/scripts/relevance-gate.mjs" --repository "<repo-root>" --adoption-only

For other work with known files, check the same two files and run:

node "<repo-root>/{{skill-path}}/scripts/relevance-gate.mjs" --repository "<repo-root>" --path "<file>" [--path "<file>" ...]

Use the absolute repository root and file paths relative to it, including from subdirectories. Pass only known paths; never scan or run Git for this precheck. Skip the path check when none are known. Check newly discovered paths as a separate batch and reuse unchanged results.

On output 1, read the exact SKILL.md unless its complete unchanged instructions are already available. Retain the successful gate mode, checked paths, and result. Missing files, output 0, and errors continue silently. Use only the repository-local installation, without searching for another copy or installing or initializing through this precheck.
<!-- moldea:end -->
