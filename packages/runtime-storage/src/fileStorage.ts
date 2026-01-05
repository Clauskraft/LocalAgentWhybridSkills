import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { FileStorageConfig, ExecutionContext, StoredFile } from './types.js';

export class FileStorage {
  private config: FileStorageConfig;
  private executionContext: ExecutionContext;

  constructor(config: FileStorageConfig) {
    this.config = {
      maxFileSize: 1024 * 1024, // 1MB default
      allowedExtensions: ['*'], // Allow all by default
      ...config
    };

    this.executionContext = {
      executionId: config.executionId,
      basePath: config.basePath,
      tempDir: path.join(config.basePath, 'temp', config.executionId),
      outputDir: path.join(config.basePath, 'output', config.executionId)
    };

    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    await fs.mkdir(this.executionContext.tempDir, { recursive: true });
    await fs.mkdir(this.executionContext.outputDir, { recursive: true });
  }

  /**
   * Store a file in the execution's output directory
   */
  async storeFile(filename: string, content: Buffer | string): Promise<string> {
    const filePath = path.join(this.executionContext.outputDir, filename);

    // Check file size limit
    const contentSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8');
    if (contentSize > this.config.maxFileSize! * 1024) {
      throw new Error(`File size ${contentSize} bytes exceeds limit of ${this.config.maxFileSize}KB`);
    }

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    if (!this.config.allowedExtensions!.includes('*') &&
        !this.config.allowedExtensions!.includes(ext)) {
      throw new Error(`File extension ${ext} is not allowed`);
    }

    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * Create a temporary file in the execution's temp directory
   */
  async createTempFile(prefix = 'temp', suffix = ''): Promise<string> {
    const filename = `${prefix}-${uuidv4()}${suffix}`;
    const filePath = path.join(this.executionContext.tempDir, filename);

    // Create empty file
    await fs.writeFile(filePath, '');
    return filePath;
  }

  /**
   * Read a file from storage
   */
  async readFile(filename: string): Promise<Buffer> {
    const filePath = path.join(this.executionContext.outputDir, filename);
    return fs.readFile(filePath);
  }

  /**
   * List all files in the execution's output directory
   */
  async listFiles(): Promise<StoredFile[]> {
    try {
      const files = await fs.readdir(this.executionContext.outputDir);
      const fileStats = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(this.executionContext.outputDir, filename);
          const stats = await fs.stat(filePath);
          return {
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isParquet: filename.endsWith('.parquet')
          };
        })
      );
      return fileStats;
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  }

  /**
   * Clean up temporary files (called at end of execution)
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.executionContext.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Temp dir might not exist or already be cleaned
      console.warn('Failed to cleanup temp directory:', error);
    }
  }

  /**
   * Get execution context information
   */
  getExecutionContext(): ExecutionContext {
    return { ...this.executionContext };
  }

  /**
   * Check if execution directory exists
   */
  async executionExists(): Promise<boolean> {
    try {
      await fs.access(this.executionContext.outputDir);
      return true;
    } catch {
      return false;
    }
  }
}
