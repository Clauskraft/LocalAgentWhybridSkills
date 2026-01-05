import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ParquetWriter, ParquetReader } from 'parquetjs';
import type { DataStorageConfig, StoredFile } from './types.js';

export class DataStorage {
  private config: DataStorageConfig;

  constructor(config: DataStorageConfig) {
    this.config = {
      parquetThreshold: 50, // 50KB default
      ...config
    };
  }

  /**
   * Store data - automatically chooses format based on size
   */
  async storeData(filename: string, data: any[]): Promise<string> {
    const jsonSize = this.estimateJsonSize(data);

    if (jsonSize > this.config.parquetThreshold! * 1024) {
      // Store as Parquet
      return this.storeAsParquet(filename, data);
    } else {
      // Store as JSON
      return this.storeAsJson(filename, data);
    }
  }

  /**
   * Load data from storage (auto-detects format)
   */
  async loadData(filename: string): Promise<any[]> {
    const filePath = this.getFilePath(filename);

    if (filename.endsWith('.parquet')) {
      return this.loadFromParquet(filePath);
    } else {
      return this.loadFromJson(filePath);
    }
  }

  private async storeAsJson(filename: string, data: any[]): Promise<string> {
    const filePath = this.getFilePath(`${filename}.json`);
    const jsonContent = JSON.stringify(data, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, jsonContent, 'utf8');

    return filePath;
  }

  private async storeAsParquet(filename: string, data: any[]): Promise<string> {
    const filePath = this.getFilePath(`${filename}.parquet`);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Infer schema from first record
    const schema = this.inferParquetSchema(data[0]);

    // Write Parquet file
    const writer = await ParquetWriter.openFile(schema, filePath);
    for (const record of data) {
      await writer.appendRow(record);
    }
    await writer.close();

    return filePath;
  }

  private async loadFromJson(filePath: string): Promise<any[]> {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  private async loadFromParquet(filePath: string): Promise<any[]> {
    const reader = await ParquetReader.openFile(filePath);
    const records: any[] = [];

    const cursor = reader.getCursor();
    let record;
    while ((record = await cursor.next())) {
      records.push(record);
    }

    await reader.close();
    return records;
  }

  private inferParquetSchema(sampleRecord: any): any {
    // Simple schema inference - in production, this would be more sophisticated
    const schema: any = {};

    for (const [key, value] of Object.entries(sampleRecord)) {
      if (typeof value === 'string') {
        schema[key] = { type: 'UTF8' };
      } else if (typeof value === 'number') {
        schema[key] = { type: 'DOUBLE' };
      } else if (typeof value === 'boolean') {
        schema[key] = { type: 'BOOLEAN' };
      } else {
        // Default to UTF8 for complex objects
        schema[key] = { type: 'UTF8' };
      }
    }

    return schema;
  }

  private estimateJsonSize(data: any[]): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private getFilePath(filename: string): string {
    return path.join(this.config.basePath, this.config.executionId, filename);
  }

  /**
   * List stored data files
   */
  async listDataFiles(): Promise<StoredFile[]> {
    try {
      const executionDir = path.join(this.config.basePath, this.config.executionId);
      const files = await fs.readdir(executionDir);

      const dataFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.parquet'));

      const fileStats = await Promise.all(
        dataFiles.map(async (filename) => {
          const filePath = path.join(executionDir, filename);
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
      return [];
    }
  }

  /**
   * Clean up execution data
   */
  async cleanup(): Promise<void> {
    const executionDir = path.join(this.config.basePath, this.config.executionId);
    try {
      await fs.rm(executionDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup data storage:', error);
    }
  }
}
