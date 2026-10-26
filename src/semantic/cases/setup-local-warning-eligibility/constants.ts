// host-permitted Git probe for the shared tracked AGENTS.md warning subject
export const TRACKED_AGENTS_GIT_PROBE =
  'git -c core.fsmonitor= -c core.askPass= -c core.pager=cat -c color.ui=false -c submodule.recurse=false -c credential.helper= --no-pager ls-files --cached --stage --full-name -z -- AGENTS.md';
