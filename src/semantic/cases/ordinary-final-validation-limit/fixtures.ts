// 2857 material records place 16 real CLI pages just below the 524288-byte boundary
// each row is a distinct contract with material review and escalation requirements
export const CONTRACT_COUNT = 2857;

// current summary supplied to the actor so legitimate evidence reuse leaves room for traversal
export const INITIAL_PROJECT_SUMMARY =
  '# Contract review service\n\nContract inventory summary pending. Human reviewers retain refund approval.\n';

/** Builds substantive contract policy for a deliberate ordinary-output boundary check. */
export const createBoundaryLedger = (): string => {
  const rows = Array.from({ length: CONTRACT_COUNT }, (_, index) =>
    [
      `contract-${String(index + 1).padStart(4, '0')}`,
      `region-${1 + Math.floor(index / 32)}`,
      ['direct', 'partner', 'enterprise', 'assisted'][index % 4],
      `product-${1 + (index % 16)}`,
      7 + (index % 54),
      24 + (index % 8) * 12,
      index % 5 === 0 ? 'independent-review' : 'standard-review',
      ['verified-receipt', 'signed-event-log', 'account-audit-record'][index % 3],
      2 + (index % 7),
      `review-queue-${1 + (index % 16)}`,
      ['supervisor', 'legal-reviewer', 'account-owner'][index % 3],
      `authority-${1000 + index}`,
      90 + (index % 12) * 30,
      `decision-${1000 + index}`,
    ].join(' | '),
  );
  return (
    '# Contract review authority\n\nEach row governs a distinct active contract. Review deadlines and retention are calendar days; evidence windows are hours after delivery confirmation. Missing proof requires the named escalation authority. Human reviewers retain refund approval. This ledger is authoritative; summarize its count and deadline range without editing contract requirements.\n\n| Contract | Region | Channel | Product | Review days | Evidence hours | Review kind | Proof source | Proof count | Queue | Escalation | Authority | Retention days | Decision |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    rows.map((row) => `| ${row} |`).join('\n') +
    '\n'
  );
};
