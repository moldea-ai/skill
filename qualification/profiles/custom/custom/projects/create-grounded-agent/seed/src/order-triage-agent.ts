// deterministic custom-runtime agent used by the qualification project
export const createOrderTriageAgent = () => ({
  id: 'order-triage',
  canApproveRefunds: false,
  action: 'classify-for-human-review',
});
