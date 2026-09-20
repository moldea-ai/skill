export interface IPortableGenerationOptions {
  check?: boolean;
  rootDirectory?: string;
}

export interface IPortableGenerationResult {
  artifacts: string[];
  status: 'current' | 'generated';
}

export interface IRuntimeGenerationOptions {
  outputDirectory?: string;
  rootDirectory?: string;
}

export interface IRuntimeGenerationResult {
  artifacts: string[];
}
