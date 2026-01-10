// integrations/dataverse/client.ts
import { DATAVERSE_URL, DATAVERSE_TOKEN } from './config';

export async function dataverseRequest<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${DATAVERSE_URL}${path}`;
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${DATAVERSE_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Dataverse request failed ${response.status}: ${txt}`);
    }
    return (await response.json()) as T;
}

export async function createRecord(entity: string, data: Record<string, any>) {
    return dataverseRequest<any>('POST', `/${entity}s`, data);
}

export async function getRecord(entity: string, id: string) {
    return dataverseRequest<any>('GET', `/${entity}s(${id})`);
}
