/** Enhances run selection and loads only the conversation the reader opens. */
export const initializeJourneyViewers = (document: Document, signal: AbortSignal): void => {
  const enhancedRuns = new WeakSet<HTMLSelectElement>();
  const initializeRuns = (root: ParentNode) => {
    for (const group of root.querySelectorAll<HTMLElement>('[data-journey-trials]')) {
      const select = group.querySelector<HTMLSelectElement>('[data-journey-run-select]');
      if (!select || enhancedRuns.has(select)) continue;
      enhancedRuns.add(select);
      const runs = [...group.querySelectorAll<HTMLElement>('[data-journey-run]')];
      const update = () => {
        for (const run of runs) run.hidden = run.dataset['journeyRun'] !== select.value;
      };
      select.hidden = false;
      group.querySelector<HTMLElement>('[data-run-select-label]')!.hidden = false;
      select.addEventListener('change', update, { signal });
      update();
    }
  };
  const selectAvailableProvider = (viewer: HTMLElement) => {
    if (
      viewer
        .querySelector('[data-journey-provider="chatgpt"]')
        ?.getAttribute('data-has-results') === 'false'
    )
      viewer
        .querySelector<HTMLAnchorElement>('[data-panel-id$="-claude-panel"][role="tab"]')
        ?.click();
  };
  initializeRuns(document);
  for (const viewer of document.querySelectorAll<HTMLElement>('[data-journey-viewer]'))
    selectAvailableProvider(viewer);

  for (const launcher of document.querySelectorAll<HTMLElement>('[data-journey-launcher]')) {
    const trigger = launcher.querySelector<HTMLButtonElement>('[data-dialog-trigger]');
    const dialog = launcher.querySelector<HTMLDialogElement>('dialog');
    const viewer = launcher.querySelector<HTMLElement>('[data-journey-viewer]');
    const retry = launcher.querySelector<HTMLButtonElement>('[data-journey-retry]');
    if (!trigger || !dialog || !viewer || !retry) continue;
    let request: AbortController | undefined;
    let loaded = false;
    const load = async () => {
      if (loaded || request) return;
      const controller = new AbortController();
      request = controller;
      const requestSignal = AbortSignal.any([
        signal,
        controller.signal,
        AbortSignal.timeout(15_000),
      ]);
      retry.hidden = true;
      viewer.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(launcher.dataset['journeyUrl']!, { signal: requestSignal });
        if (!response.ok) throw new Error('Conversation request failed.');
        const source = new DOMParser().parseFromString(await response.text(), 'text/html');
        const captured = source.querySelector<HTMLElement>('[data-journey-viewer]');
        if (
          !captured ||
          captured.dataset['journeyId'] !== viewer.dataset['journeyId'] ||
          captured.dataset['journeySnapshot'] !== viewer.dataset['journeySnapshot']
        )
          throw new Error('Conversation identity mismatch.');
        const providers = ['chatgpt', 'claude'].map((platform) => ({
          target: viewer.querySelector<HTMLElement>(`[data-journey-provider="${platform}"]`)!,
          content: captured.querySelector<HTMLElement>(`[data-journey-provider="${platform}"]`),
        }));
        if (providers.some(({ content }) => !content))
          throw new Error('Conversation is incomplete.');
        if (requestSignal.aborted) return;
        for (const { target, content } of providers) target.replaceChildren(...content!.childNodes);
        loaded = true;
        initializeRuns(viewer);
      } catch {
        if (signal.aborted || controller.signal.aborted || !dialog.open) return;
        for (const status of viewer.querySelectorAll<HTMLElement>('[role="status"]'))
          status.textContent = 'Could not load the conversation. Try again or open the full page.';
        retry.hidden = false;
      } finally {
        if (request === controller) {
          viewer.removeAttribute('aria-busy');
          request = undefined;
        }
      }
    };
    trigger.addEventListener('click', () => void load(), { signal });
    retry.addEventListener('click', () => void load(), { signal });
    dialog.addEventListener(
      'close',
      () => {
        request?.abort();
        request = undefined;
        viewer.removeAttribute('aria-busy');
      },
      { signal },
    );
  }
};
