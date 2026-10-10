// one page-level controller; additional cards stay inert until their category is requested
let disclosureController: AbortController | undefined;

/** Releases page listeners before Astro replaces their owning document. */
export const disposeCapabilityDisclosure = (): void => {
  disclosureController?.abort();
  disclosureController = undefined;
};

/** Enhances the fixed four-plus-four catalog, including links to initially inert examples. */
export const initializeCapabilityDisclosure = (): void => {
  disposeCapabilityDisclosure();
  const sections = document.querySelectorAll<HTMLElement>('[data-capability-section]');
  if (sections.length === 0) return;
  disclosureController = new AbortController();
  const { signal } = disclosureController;

  for (const section of sections) {
    const button = section.querySelector<HTMLButtonElement>('[data-capability-load]');
    const template = section.querySelector<HTMLTemplateElement>('[data-capability-more]');
    const list = section.querySelector<HTMLElement>('[data-capability-list]');
    const count = section.querySelector<HTMLElement>('[data-capability-enhanced-count]');
    if (!button || !template || !list || !count) continue;
    count.hidden = false;
    button.hidden = template.content.childElementCount === 0;
    button.addEventListener(
      'click',
      () => {
        const firstHeading = template.content.querySelector<HTMLElement>('h3');
        // template and no-JavaScript copies use distinct static IDs; restore public IDs on insertion
        for (const element of template.content.querySelectorAll<HTMLElement>('[id]')) {
          element.id = element.id.slice('pending-'.length);
          const labelledBy = element.getAttribute('aria-labelledby');
          if (labelledBy)
            element.setAttribute('aria-labelledby', labelledBy.slice('pending-'.length));
        }
        list.append(template.content);
        count.textContent = '8 of 8 examples';
        // move focus before hiding the final control so keyboard users keep their place
        firstHeading?.focus();
        button.hidden = true;
      },
      { signal },
    );
  }

  const revealHashTarget = (): void => {
    let targetId: string;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (targetId === '' || document.getElementById(targetId)) return;
    for (const section of sections) {
      const template = section.querySelector<HTMLTemplateElement>('[data-capability-more]');
      const target = template?.content.getElementById(`pending-${targetId}`);
      const button = section.querySelector<HTMLButtonElement>('[data-capability-load]');
      if (!target || !button) continue;
      button.click();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
  };
  window.addEventListener('hashchange', revealHashTarget, { signal });
  revealHashTarget();
};
