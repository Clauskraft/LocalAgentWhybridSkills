// integrations/dataverse/config.ts
export const DATAVERSE_URL = process.env.DATAVERSE_URL ?? '';
export const DATAVERSE_TOKEN = process.env.DATAVERSE_TOKEN ?? '';
if (!DATAVERSE_URL) {
    throw new Error('DATAVERSE_URL environment variable is required');
}
if (!DATAVERSE_TOKEN) {
    throw new Error('DATAVERSE_TOKEN environment variable is required');
}
