Run {{runId}} on {{platform}} using the installed project instructions.

Bundle SHA-256: {{sha256}}
Download URL: {{url}}
ChatGPT: use the attached bundle. Claude: download the bundle from the URL. These are identical bytes.

Extract the bundle, create an empty workspace outside it, change into that workspace, and run:
`node <bundle-root>/harness/setup.mjs --run {{runId}} --sha256 {{sha256}} --platform {{platform}} --bundle-zip <absolute-zip-path> --bundle-dir <absolute-bundle-root>`

Treat each request printed by `next` as if I had typed it. Follow the protocol through the final attached export. Record the selected model and any non-default settings in your first reply.
