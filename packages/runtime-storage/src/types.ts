export interface FileStorageConfig {
  basePath: string;
  executionId: string;
  maxFileSize?: number; // KB
  allowedExtensions?: string[];
}

export interface DataStorageConfig {
  basePath: string;
  executionId: string;
  parquetThreshold?: number; // KB - files above this size get stored as Parquet
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface StoredFile {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  isParquet: boolean;
}

export interface ExecutionContext {
  executionId: string;
  basePath: string;
  tempDir: string;
  outputDir: string;
}
