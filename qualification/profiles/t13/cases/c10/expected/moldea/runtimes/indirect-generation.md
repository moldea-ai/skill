# Indirect generation boundary

`supportAgent` builds the `generateText` request outside the direct call and `prepareStep` can replace instructions. moldea cannot prove a direct runtime pattern or instruction-loader relationship. Prefer a directly exported wrapper with an object-literal `generateText({ ... })` call and lexically visible `instructions` when this integration is made statically inspectable.
