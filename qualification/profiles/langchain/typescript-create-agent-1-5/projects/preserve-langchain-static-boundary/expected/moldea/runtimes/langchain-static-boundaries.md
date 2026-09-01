# LangChain static boundaries

`supportAgent` uses non-empty middleware, so its instruction, output schema, and tool registration remain unresolved even though the direct `createAgent` definition is visible.

`stepSupportAgent` uses multiple response formats, state and context schemas, and a headless client tool. These are valid LangChain configuration, but they do not map to the selected canonical output-schema, input-schema, or repository-local tool relationships.

Use absent or provably empty middleware, one supported response schema, and normal two-argument function tools when those relationships must be represented canonically.
