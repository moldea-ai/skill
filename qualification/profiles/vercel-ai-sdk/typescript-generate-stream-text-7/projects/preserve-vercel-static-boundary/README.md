# Unsupported generation indirection

The project calls `generateText` through a request builder whose `prepareStep` can replace instructions. The adapter deliberately cannot prove a direct runtime pattern or instruction-loader relationship.
