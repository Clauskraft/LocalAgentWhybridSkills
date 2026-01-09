export const commonModelFallbacks = [
    '', // 'auto' / server default
    'qwen2.5-coder:7b',
    'qwen2.5-coder',
    'qwen3:8b',
    'llama3.1',
    'mistral'
];

export function isModelNotFoundError(error: any): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /model/i.test(msg) && /not found/i.test(msg);
}

export function cleanChatTitle(content: string): string {
    // Remove emojis and trim
    let title = content
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

    if (!title) return "Ny samtale";

    // Start with uppercase
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Limit length
    if (title.length > 35) {
        title = title.slice(0, 32) + "...";
    }

    return title;
}
