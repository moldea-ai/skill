// realistic root-level repository example rendered by the filesystem
export const REPOSITORY_FORMAT_EXAMPLE = {
  agents: [
    {
      behaviorFiles: ['description.md', 'instruction.md'],
      id: 'support-agent',
      implementationFiles: ['support-agent.ts', 'support-tools.ts'],
    },
  ],
  contextFiles: ['support-policy.md', 'customer-data.md'],
  projectDirectory: 'my-platform/',
} as const;
