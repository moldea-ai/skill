// validation replies may name the valid status or explicitly report that validation passed
export const VALIDATION_REPLY_PATTERN = '\\bvalid\\b|\\bvalidation\\s+(?:\\*\\*)?passed\\b';

/*
 * Reject direct invalid-status, failed-validation, and not-valid claims. Explanations such as
 * "warnings don't make the project invalid" do not contradict a valid result.
 */
export const VALIDATION_REPLY_CONTRADICTION_PATTERN =
  "\\b(?:is|was|remains|became)\\s+(?:\\*\\*)?invalid\\b|\\b(?:status|result|project|setup|moldea|validation)[\"']?\\s*[:=]\\s*[\"']?(?:\\*\\*)?invalid\\b|(?:^|[\\n.!?;,])\\s*(?:[-*]\\s+)?(?:\\*\\*)?(?:(?:project|setup|moldea|validation)\\s+)?invalid\\b|\\b(?:not|isn['’]t|wasn['’]t)\\s+(?:\\*\\*)?valid\\b|\\bvalidation\\s+(?:\\*\\*)?(?:failed|(?:did\\s+not|didn['’]t)\\s+pass)\\b";
