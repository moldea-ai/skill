// canonical public route for semantic evidence
export const SEMANTIC_EVALUATION_ROUTE = '/evidence/semantic/';
export const SEMANTIC_EVALUATION_METHODOLOGY_ROUTE = '/docs/semantic-evaluation/';

// readable group labels shown before individual case evidence
export const SEMANTIC_EVALUATION_GROUPS = {
  adoption: {
    description:
      'Checks when project knowledge should be created, updated, or left unchanged as the code moves.',
    title: 'Keep project knowledge current',
  },
  abstention: {
    description:
      'Checks whether ordinary questions and unrelated work stay focused without unnecessary project maintenance.',
    title: 'Stay out of unrelated work',
  },
  relevance: {
    description:
      'Checks whether declared file connections activate the smallest useful project review.',
    title: 'Follow declared connections',
  },
  scale: {
    description:
      'Checks whether small and large projects stay readable without loading every saved detail at once.',
    title: 'Handle projects of different sizes',
  },
  integrity: {
    description: 'Checks whether read-only work leaves files and repository controls untouched.',
    title: 'Protect repository state',
  },
  planning: {
    description:
      'Checks whether plans and AI service choices stay grounded in evidence from the project.',
    title: 'Plan from project evidence',
  },
  routing: {
    description: 'Checks whether routing descriptions and AI service boundaries remain precise.',
    title: 'Describe routing accurately',
  },
  skills: {
    description: 'Checks how reusable Agent Skills are created, maintained, evaluated, and shared.',
    title: 'Maintain reusable skills',
  },
  tooling: {
    description:
      'Checks whether repository tools and package managers are used without crossing safety limits.',
    title: 'Use project tools safely',
  },
  truth: {
    description:
      'Checks whether conflicting or incomplete project knowledge is reconciled without guessing.',
    title: 'Resolve conflicting knowledge',
  },
} as const;

// restored behavior from the complete pre-redesign semantic inventory
const RESTORED_SEMANTIC_CASE_PRESENTATION = {
  'unadopted-direct-context-handoff': {
    reviewedCaseDefinitionDigest:
      '9099a0d6643c153dce5863f1d44a0d113795e25245d683e8025303a486ff1b3b',
    groupId: 'adoption',
    title: 'Leaves unrelated context handoffs alone before adoption',
  },
  'unadopted-relevance-no-initialization': {
    reviewedCaseDefinitionDigest:
      '5c30a57d5f42e1accbc4ecf91f06bf7374d3d3babf43f632f44d9378f2708959',
    groupId: 'adoption',
    title: 'Completes unrelated implementation without adoption',
  },
  'initialize-insufficient-context': {
    reviewedCaseDefinitionDigest:
      '10ef09071b4bc8a23c47bdd210bc05d693488319f5512776245452eda71bf4e6',
    groupId: 'adoption',
    title: 'Stops when project context is insufficient',
  },
  'initialize-partial-context': {
    reviewedCaseDefinitionDigest:
      '50a7b80a67a417744f63e7dda6c1efbc8cbe77d3814ed8fa72512cdff2cff03f',
    groupId: 'adoption',
    summary:
      'Checks whether the coding agent asks one focused question before recording an uncertain payment boundary.',
    title: 'Clarifies a material project boundary',
  },
  'initialize-sufficient-context': {
    reviewedCaseDefinitionDigest:
      'a9efe3b5deb1676bc2a56b69c4bbf93d0b29928d164d53597a2bdf52331cf9bd',
    groupId: 'adoption',
    title: 'Initializes from sufficient evidence',
  },
  'adopted-direct-context-handoff': {
    reviewedCaseDefinitionDigest:
      '0aae25b09ce0754db2d4481e25599d85e096c0b5ed9e444ef02c8a7169d63ce4',
    groupId: 'truth',
    title: 'Leaves unrelated context handoffs outside canonical state',
  },
  'adopted-explicit-context-correction': {
    reviewedCaseDefinitionDigest:
      '9a23a41aefccfa170d3356e23fb0496c2883fd163e72144b82318b96520a3ffa',
    groupId: 'truth',
    title: 'Does not capture unsolicited canonical corrections',
  },
  'adopted-ambiguous-context-handoff': {
    reviewedCaseDefinitionDigest:
      '8e2ad7acd637b044f167b4585a8358b632c161bbc939b7e6b5fe630ddce4b214',
    groupId: 'truth',
    title: 'Leaves ambiguous handoffs outside canonical state',
  },
  'adopted-relevance-no-change': {
    reviewedCaseDefinitionDigest:
      '310fb490166eb9f628cfa448c0ae8a142c548262b18508bc0a459f7c08941c18',
    groupId: 'adoption',
    title: 'Leaves aligned project context unchanged',
  },
  'adopted-relevance-changed-behavior': {
    reviewedCaseDefinitionDigest:
      'f2a45371589afb45a1d797a219a1e983eac064d891512e26d354a154318517c8',
    groupId: 'adoption',
    summary:
      'Checks whether the coding agent updates the implementation, saved instructions, and their declared copy together.',
    title: 'Updates context after behavior changes',
  },
  'agent-adoption-inline-runtime-instruction': {
    reviewedCaseDefinitionDigest:
      'fe936632d13e96284da0fcd277b8ca65a43dbec1463f2b7bcff33cd4c4b4acf2',
    groupId: 'adoption',
    title: 'Adopts an inline runtime instruction safely',
  },
  'evaluate-dirty-working-tree': {
    reviewedCaseDefinitionDigest:
      '4c60a27574add8ae33666a6dff60ebf0c29df6e512cc4c197357551efa160050',
    groupId: 'adoption',
    title: 'Evaluates a dirty working tree without editing it',
  },
  'evaluate-brief-project-request': {
    reviewedCaseDefinitionDigest:
      '8edf3884ea4490cc041792d2a163f0721a3db4d5bee6fc6da8a90a2623bbacb4',
    groupId: 'abstention',
    title: 'Preserves a brief host evaluation request',
  },
  'evaluate-clean-working-tree': {
    reviewedCaseDefinitionDigest:
      'f37611f1da3305b2ea2d10303dcbc4f0d84528cec0acaf40ccefced18fcb1a4b',
    groupId: 'adoption',
    title: 'Evaluates a clean working tree',
  },
  'evaluate-unborn-repository': {
    reviewedCaseDefinitionDigest:
      '565affe44a9da9938006de44304fb9900c2a0c2a9a7bca6fa9b3b4860a4c9b21',
    groupId: 'adoption',
    title: 'Evaluates a repository without commits',
  },
  'reconcile-material-ambiguity': {
    reviewedCaseDefinitionDigest:
      '6f2d3b4c00371dd66b737c1c4992b362c9d7d76c05d80f001a040270a28d09c7',
    groupId: 'truth',
    title: 'Escalates material ambiguity',
  },
  'dedicated-repository-single-side-change': {
    reviewedCaseDefinitionDigest:
      '1d99ad989c985b748c06d8f8612b9a85865a993e28b7ac772aa9dcee24e62aa9',
    groupId: 'truth',
    title: 'Reconciles a one-sided source change',
  },
  'unresolved-related-file-changed': {
    reviewedCaseDefinitionDigest:
      '250ac1368f7bd70173b3ce2b4c3fdc44197373c22a450be9a75fa999b2652e1e',
    groupId: 'truth',
    title: 'Detects unresolved related changes',
  },
  'canonical-instruction-changed': {
    reviewedCaseDefinitionDigest:
      '8d28cdca7a4df1d949d8827b5a09f1e5af7079ae0c659564dec0d5c8becbe83e',
    groupId: 'truth',
    title: 'Propagates canonical instruction changes',
  },
  'maintain-context-without-duplication': {
    reviewedCaseDefinitionDigest:
      'abc60d63ae565b2ddadd7a88cf7f92cc3258fa7da934afd44ba952e6644c0e74',
    groupId: 'truth',
    title: 'Maintains context without duplicating truth',
  },
  'compress-project-context': {
    reviewedCaseDefinitionDigest:
      '7045a5a60898e6970eed77e01ab17a188aaa3c3c9dc74e0543564eeecb73eef2',
    groupId: 'truth',
    title: 'Compresses project context without losing meaning',
  },
  'compress-conflicting-project-context': {
    reviewedCaseDefinitionDigest:
      '9b5f79fd9a93bec98ead8b64c9d97285c7627be0c38a62e677efe8d644a275fa',
    groupId: 'truth',
    title: 'Stops compression on conflicting truth',
  },
  'provider-hosted-capability': {
    reviewedCaseDefinitionDigest:
      'beb1f01ff5b0c087f339a1c673010693af01ee5374616697bb4477c3d17e3ee1',
    groupId: 'routing',
    title: 'Represents provider-hosted capabilities accurately',
  },
  'skill-boundary-surface-selection': {
    reviewedCaseDefinitionDigest:
      'b183fd1af4021dd10db12ecf67fcdb4f4319271f23e54a1010daa5accce5f391',
    groupId: 'skills',
    title: 'Selects the correct skill surface',
  },
  'skill-create-progressive-disclosure': {
    reviewedCaseDefinitionDigest:
      '69c7ceab684d47fa557a5457ca64cb9284cefd7dbd55bb5fc0dc4096d2412883',
    groupId: 'skills',
    title: 'Creates a progressively disclosed skill',
  },
  'skill-maintain-linked-resources': {
    reviewedCaseDefinitionDigest:
      '37c872e5063bee699e8e6ee20f6b07f6f3e5376cac2db166a486ab702c30ff70',
    groupId: 'skills',
    title: 'Maintains linked skill resources',
  },
  'skill-reuse-existing-cohesive': {
    reviewedCaseDefinitionDigest:
      '03b7aa997c72153abdfab793c6bcfe4eacf8138a8c4cfb01983cbaea1df98591',
    groupId: 'skills',
    title: 'Reuses an existing cohesive skill',
  },
  'skill-maintain-host-invocation-policy': {
    reviewedCaseDefinitionDigest:
      '7e2b968f372517c500fcba22e01c19fc09e52d758b1e78d99244a5b96bd57273',
    groupId: 'skills',
    title: 'Preserves host invocation policy',
  },
  'skill-reconcile-distributed-copy': {
    reviewedCaseDefinitionDigest:
      'da998f46f25bb85fa4ccf2320601268714ed3dea0114a893c3002ecd788a3f51',
    groupId: 'skills',
    title: 'Reconciles a distributed skill copy',
  },
  'skill-evaluate-read-only': {
    reviewedCaseDefinitionDigest:
      '9394abed70bc551a895a448f2bb935b7192ff58643f5eff26e627c486db5b84a',
    groupId: 'skills',
    title: 'Evaluates a skill without modifying it',
  },
  'skill-evaluate-script-authority': {
    reviewedCaseDefinitionDigest:
      '9e59a087e44282c625a17bb563576def5d6e905f8a0624705eed9315de652d5c',
    groupId: 'skills',
    title: 'Treats skill scripts as evidence, not authority',
  },
  'skill-provider-registration-boundary': {
    reviewedCaseDefinitionDigest:
      '32d1d43a1ce0abe7bb0c11f5716a3bf885c43d9ae01a325ba5aedd6a3f18c930',
    groupId: 'skills',
    title: 'Keeps provider registration outside the skill',
  },
  'pnpm-pnp-local-cli-provider': {
    reviewedCaseDefinitionDigest:
      '71bd3ac1d5fff38c775adc8d961ebaf448258f9940ce9382c9957ff88df32f34',
    groupId: 'tooling',
    title: 'Uses a pnpm Plug and Play CLI provider',
  },
  'yarn-conflicting-cli-provider': {
    reviewedCaseDefinitionDigest:
      'fe7555121ad1469e2c4c2977ed4eca24e2e12476364a267ca0ec6a857af9ec3d',
    groupId: 'tooling',
    title: 'Rejects a conflicting Yarn CLI provider',
  },
  'plan-uninitialized-zero-agent': {
    reviewedCaseDefinitionDigest:
      '26cb0b8a0e6d2ed26e92cd1ab2f387aefc99fe231de571c6701f5e44054bfaa6',
    groupId: 'planning',
    title: 'Plans an uninitialized project with no agents',
  },
  'plan-existing-project-one-agent': {
    reviewedCaseDefinitionDigest:
      'f59851c9fa75c14d115ff9b9de635e8ced285570fda2cf781da30724a480c967',
    groupId: 'planning',
    title: 'Plans an existing single-agent project',
  },
  'plan-justified-multi-agent': {
    reviewedCaseDefinitionDigest:
      '5cf2539802fa63e112e5455d1b6ad094c90c0f9961555d6d5ee9266bb5398c07',
    groupId: 'planning',
    title: 'Uses multiple agents only when justified',
  },
  'plan-material-ambiguity': {
    reviewedCaseDefinitionDigest:
      '4b60a7ef9609762026fd277f60ea2cbf8e9893bf33e941443863b17bd6a91268',
    groupId: 'planning',
    title: 'Stops planning at material ambiguity',
  },
  'plan-runtime-inventory-insufficient-evidence': {
    reviewedCaseDefinitionDigest:
      'eca77daafdb4f644bc1780a47988ed0e6fa0a122e4192fb188efde87cd003c0c',
    groupId: 'planning',
    title: 'Rejects an unsupported runtime choice',
  },
  'available-runtime-insufficient-behavioral-evidence': {
    reviewedCaseDefinitionDigest:
      'e25c9a9b6e9c756bd56d20538715e2cce2b444bb83b38b9b92cba29e4c2a0a7e',
    groupId: 'planning',
    title: 'Separates availability from behavioral fit',
  },
  'eve-later-stable-local-eligibility': {
    reviewedCaseDefinitionDigest:
      '471c0920ca091b9a5253c6a337f56fd07c689747be5026bf0fdced4b63963ef7',
    groupId: 'planning',
    title: 'Checks newer Eve versions locally',
  },
  'eve-invalid-package-metadata': {
    reviewedCaseDefinitionDigest:
      'df29203ed8765d4e88fa4e1ccd63e861ab662eaebbf91b53d2574fb6ab3448ce',
    groupId: 'planning',
    title: 'Identifies invalid local package information',
  },
  'eve-source-pattern-unresolved': {
    reviewedCaseDefinitionDigest:
      '3e5090d7546c6f81dbb45357c5b7a8ec921650632d568561b55b23395daf3cde',
    groupId: 'planning',
    title: 'Recognizes the limits of dynamic runtime code',
  },
  'runtime-adapter-not-installed': {
    reviewedCaseDefinitionDigest:
      'c956ff2014234511fe2407913901c29b9dadee8745cf298041931351b4440b93',
    groupId: 'planning',
    title: 'Identifies an unavailable runtime adapter',
  },
  'runtime-package-version-mismatch': {
    reviewedCaseDefinitionDigest:
      '7763ca16bc2b6cbc0331090a370e0df9c2e822026669b54fe4e1311197ed945e',
    groupId: 'planning',
    title: 'Rejects a provider-package version mismatch',
  },
  'dedicated-repository-runtime-selection': {
    reviewedCaseDefinitionDigest:
      '7887bbfbbfd2e189c978c0b565a2acf15949530e546c22b2a0e8faac560215c8',
    groupId: 'planning',
    title: 'Selects a runtime from repository evidence',
  },
  'routing-description-dynamic-wiring': {
    reviewedCaseDefinitionDigest:
      '7a59921ad4ee4567075aca58e7fa2553d6e190cb4d4ec4b048b1846cc7623de1',
    groupId: 'routing',
    title: 'Describes dynamic routing wiring',
  },
  'routing-description-fallback': {
    reviewedCaseDefinitionDigest:
      '832e20b86977fcf5c82c9b0a25ca17f4cca4e68b87b4a2c7d8dfc8dfce6aa1e1',
    groupId: 'routing',
    title: 'Documents routing fallback behavior',
  },
  'routing-description-property-name': {
    reviewedCaseDefinitionDigest:
      '1838ac7c3601c205668efb5a7a71f93e37e720ad3828a9f0780507c49f6c35c2',
    groupId: 'routing',
    title: 'Uses the correct routing property name',
  },
  'routing-description-reconciliation': {
    reviewedCaseDefinitionDigest:
      '80a5237bf0421e569de821cf6bc9f0f6c8d0ee657e8a636b131f911233abc507',
    groupId: 'routing',
    title: 'Reconciles a routing description',
  },
  'routing-description-separate-properties': {
    reviewedCaseDefinitionDigest:
      '0ba8efe52d470cf3fca912ab16fcac231b7cb12098787b8b626f2ff6c759ef5f',
    groupId: 'routing',
    title: 'Keeps separate routing properties distinct',
  },
  'routing-description-shared-property': {
    reviewedCaseDefinitionDigest:
      'ae5e7ee7d071abe1ee4599249f2a8aaf31cedec9cef13113b935832a40111c9b',
    groupId: 'routing',
    title: 'Represents a shared routing property',
  },
  'unavailable-runtime-selection': {
    reviewedCaseDefinitionDigest:
      'a5f46d224ff167e63324bccccac2f27c880365de6d22977e5a18d7cba57fd865',
    groupId: 'planning',
    title: 'Rejects an unavailable runtime',
  },
  'read-only-git-helper-suppression': {
    reviewedCaseDefinitionDigest:
      'fb919810db4dba4128264b99d2730bbad517eb34c2a589607172f0cf6dd1c6de',
    groupId: 'tooling',
    title: 'Suppresses write-capable Git helpers',
  },
  'pnpm-hook-install-blocked': {
    reviewedCaseDefinitionDigest:
      '608303fa2ec2d300fefa18821529d50064cee4198f5678c88d3c4b219607182c',
    groupId: 'tooling',
    title: 'Blocks unsafe pnpm hook installation',
  },
  'yarn-plugin-install-blocked': {
    reviewedCaseDefinitionDigest:
      '639bc0d0ecef135f24ab06a6d46332cb89f988acbfd80cbb0996524a38ecce2f',
    groupId: 'tooling',
    title: 'Blocks unsafe Yarn plugin installation',
  },
} as const;

// clean-slate scenarios added during the resource-bounded redesign
const CLEAN_SLATE_SEMANTIC_CASE_PRESENTATION = {
  'preinit-information': {
    reviewedCaseDefinitionDigest:
      'b634ba6609e5174fd6a0c83b75ca92c33b76b09a79e40af12183639cc87ccae4',
    groupId: 'abstention',
    title: 'Answers product questions before adoption',
  },
  'preinit-explicit-validation': {
    reviewedCaseDefinitionDigest:
      '1d6243e228716d2adb3e7d72d4bf9acfccaf98eebf682ffa01127808c73e4e1a',
    groupId: 'abstention',
    title: 'Explains that validation requires adoption',
  },
  'preinit-canonical-looking-review': {
    reviewedCaseDefinitionDigest:
      'e37f47cbc75123d7042a320039fc1170e3ae4375dfa785eca04d00233ab0337e',
    groupId: 'abstention',
    title: 'Ignores incomplete canonical-looking files',
  },
  'explicit-initialization': {
    reviewedCaseDefinitionDigest:
      '2070eb38624caa474b7a55a1a742a78ff6673436599cd423a9db736af937b84d',
    groupId: 'relevance',
    title: 'Honors explicit repository initialization',
  },
  'unrelated-documentation-review': {
    reviewedCaseDefinitionDigest:
      '71f459ce572df0ec03d2594f4ec0e93406405ee65238ded04c8641d6df00cddd',
    groupId: 'abstention',
    title: 'Leaves unrelated documentation review alone',
  },
  'unrelated-source-review': {
    reviewedCaseDefinitionDigest:
      '277c26c9e2f7064c8d5addbf40351f165cbd4bbc8a27ca090017766bcdff042b',
    groupId: 'abstention',
    title: 'Leaves unrelated source review alone',
  },
  'readme-outside-managed-block': {
    reviewedCaseDefinitionDigest:
      'ad07f80329da009f6fd5aba8c003d9d26c2144065b6efa169807ffa47238a35e',
    groupId: 'abstention',
    title: 'Ignores README changes outside the managed block',
  },
  'generic-knowledge-handoff': {
    reviewedCaseDefinitionDigest:
      'f35dd13b788643a2af2952340b32773c2350683582f0eb69770129b10fbeec92',
    groupId: 'abstention',
    title: 'Does not capture generic durable knowledge',
  },
  'host-plan-command-precedence': {
    reviewedCaseDefinitionDigest:
      '8623c0d6e789eef9237049936ee4da18ff78e0f194ce1e28616d02efa2454831',
    groupId: 'abstention',
    title: 'Preserves host planning workflow ownership',
  },
  'host-review-command-precedence': {
    reviewedCaseDefinitionDigest:
      '7f0ea766704514fb6f71692e981c71f853868623eb7222f4591d611e4779fb70',
    groupId: 'abstention',
    title: 'Preserves host review workflow ownership',
  },
  'exact-binding-relevance': {
    reviewedCaseDefinitionDigest:
      '315a2d7b7b302da220f8f24562bfd6dd657cca05fad4282ac6191cdd1f798bcc',
    groupId: 'relevance',
    title: 'Activates for an exact agent binding',
  },
  'affected-by-relevance': {
    reviewedCaseDefinitionDigest:
      '5bbd8286e0a6e0de61e8316bbc3d3977bd1f29c7e7073a6c277cdefeed9f9238',
    groupId: 'relevance',
    title: 'Activates for an affectedBy relationship',
  },
  'direct-canonical-relevance': {
    reviewedCaseDefinitionDigest:
      '84da240ba708c7fc709dca286dff32e3cc878c9c2c54daa3d64bba16eda3f2e3',
    groupId: 'relevance',
    title: 'Recognizes direct canonical changes',
  },
  'managed-readme-relevance': {
    reviewedCaseDefinitionDigest:
      '4ca16de2ffbfb1174c7960112e98a69250ad2dbbaa28a73fc3d2124047a5f104',
    groupId: 'relevance',
    title: 'Recognizes managed README changes',
  },
  'explicit-moldea-validation': {
    reviewedCaseDefinitionDigest:
      '9945935061db398231a15425b9aa5bcfffeb0e7c086a3901a54bf0e1b92b9840',
    groupId: 'relevance',
    title: 'Honors explicit moldea validation',
  },
  'zero-agent-project-validation': {
    reviewedCaseDefinitionDigest:
      '7acdcf02f10d7ff6cdf7dbf4f2b1c534cb5ad59e7e6bb7c3ed8e300d42211076',
    groupId: 'scale',
    title: 'Validates a project with no agents',
  },
  'large-context-bounded-evaluation': {
    reviewedCaseDefinitionDigest:
      '99b4d2b6a3e771db61fabb0988c46d34a925d269da2e39fe54cb30002d3bbb47',
    groupId: 'scale',
    title: 'Pages large context without exposing bodies',
  },
  'moldea-evaluate-read-only': {
    reviewedCaseDefinitionDigest:
      'ba7ee8ae095d104c96efdcd990daa309c4e5a268753a2ac89a93c25aa446b0a8',
    groupId: 'integrity',
    title: 'Preserves repository state during evaluation',
  },
} as const;

// presentation metadata must explicitly cover every semantic case before publication
export const SEMANTIC_CASE_PRESENTATION = {
  ...RESTORED_SEMANTIC_CASE_PRESENTATION,
  ...CLEAN_SLATE_SEMANTIC_CASE_PRESENTATION,
} as const;
