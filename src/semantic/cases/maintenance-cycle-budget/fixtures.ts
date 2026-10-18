// distinct policy ledgers supply material content for three separately requested reviews
export const REVIEW_DOMAINS = [
  {
    id: 'returns',
    subject: 'return eligibility',
    event: 'delivery confirmation',
    authority: 'refund approval',
    team: 'Customer Operations',
  },
  {
    id: 'invoices',
    subject: 'invoice exception review',
    event: 'invoice receipt',
    authority: 'payment approval',
    team: 'Accounts Payable',
  },
  {
    id: 'support',
    subject: 'support escalation',
    event: 'first customer contact',
    authority: 'account-access approval',
    team: 'Support Operations',
  },
] as const;

/** Builds the complete contractual review authority, with distinct evidence for every lane. */
export const createReviewPolicy = (domainIndex: number): string => {
  const domain = REVIEW_DOMAINS[domainIndex]!;
  const records = Array.from({ length: 1024 }, (_, index) => {
    const lane = `${domain.id}-${String(index + 1).padStart(3, '0')}`;
    const days = 7 + ((index * 7 + domainIndex * 3) % 54);
    const exception = index % (domainIndex + 5) === 0;
    return [
      lane,
      `contract-${domainIndex + 1}-${1000 + index}`,
      `region-${1 + Math.floor(index / 32)}`,
      ['direct', 'partner', 'assisted', 'enterprise'][Math.floor(index / 8) % 4],
      `product-${1 + (index % 8)}`,
      days,
      24 + (index % 8) * 12,
      exception ? 'yes' : 'no',
      ['standard', 'sensitive', 'regulated'][index % 3],
      `${domain.team} ${['North', 'South', 'East', 'West'][index % 4]}`,
      ['signed-event-log', 'verified-receipt', 'customer-correspondence', 'account-audit-record'][
        index % 4
      ],
      2 + (index % 7),
      12 + (index % 6) * 6,
      `review-queue-${domain.id}-${1 + (index % 16)}`,
      ['supervisor', 'legal-reviewer', 'account-owner'][index % 3],
      `authority-${domainIndex + 1}-${1000 + index}`,
      90 + (index % 12) * 30,
      4 + (index % 8) * 4,
      ['hold-original', 'request-correction', 'manual-reconciliation'][index % 3],
      `decision-record-${domain.id}-${String(index + 1).padStart(3, '0')}`,
    ].join(' | ');
  });
  return `# ${domain.team} contract review

These 1024 active contracts govern ${domain.subject}. Each region/channel/product combination has its own row. Review the whole ledger for the coverage report; another contract's deadline or evidence requirement cannot substitute for it. Deadlines run from ${domain.event}. All evidence and escalation windows are hours; retention and review deadlines are calendar days. Minimum proof count applies to the named proof source. Notification hours run from a recorded human decision. On conflicting account/event evidence, use the conflict route and escalation authority in that row. A missing event date leaves the deadline unresolved, not automatically ineligible.

The assigned team records its recommendation. A human separately retains ${domain.authority}; neither review nor notification grants a model authority to execute that decision. Preserve the authority and decision references when escalating. The existing per-contract records are authoritative; the requested report summarizes them without replacing or editing them.

| Lane | Contract | Region | Channel | Product | Review deadline | Evidence window | Independent exception | Severity | Review team | Required proof | Minimum proof count | Escalation window | Queue | Escalation authority | Authority reference | Retention | Notification window | Conflict route | Decision reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${records.map((record) => `| ${record} |`).join('\n')}
`;
};
