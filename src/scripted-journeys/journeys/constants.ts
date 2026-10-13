// validation replies must name the valid result; invalid is a different whole-word token
export const VALIDATION_REPLY_PATTERN = '\\bvalid\\b';

/*
 * Reject direct invalid-status and not-valid claims. Explanations such as
 * "warnings don't make the project invalid" do not contradict a valid result.
 */
export const VALIDATION_REPLY_CONTRADICTION_PATTERN =
  "\\b(?:is|was|remains|became)\\s+(?:\\*\\*)?invalid\\b|\\b(?:status|result|project|setup|moldea|validation)[\"']?\\s*[:=]\\s*[\"']?(?:\\*\\*)?invalid\\b|(?:^|[\\n.!?;,])\\s*(?:[-*]\\s+)?(?:\\*\\*)?(?:(?:project|setup|moldea|validation)\\s+)?invalid\\b|\\b(?:not|isn['’]t|wasn['’]t)\\s+(?:\\*\\*)?valid\\b";
