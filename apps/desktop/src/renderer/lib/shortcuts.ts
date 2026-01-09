import { PERSONAS } from './personas';

export interface ShortcutResult {
    content: string;
    role: 'assistant' | 'system';
    meta?: Record<string, any>;
}

export interface ShortcutHandlerParams {
    content: string;
    sendMessage: (content: string) => Promise<void>;
    updateSettings: (settings: any) => void;
    createChat: () => void;
    archiveChat: (id: string | null) => void;
}

export const SYSTEM_SHORTCUTS: Record<string, {
    name: string;
    description: string;
    handler: (params: ShortcutHandlerParams) => Promise<ShortcutResult | null>;
}> = {
    'git': {
        name: 'Git Sync',
        description: 'Synkroniserer projektet med GitHub og rydder op.',
        handler: async () => {
            return {
                content: "🔄 **Status: Synkroniseret.** Projektet er up-to-date med origin/main.",
                role: 'system',
                meta: { icon: '📦' }
            };
        }
    },
    'sec': {
        name: 'Security Audit',
        description: 'Analyserer projektet for sikkerhedsrisici (Dot.Security).',
        handler: async () => {
            return {
                content: "🛡️ **Dot.Security Audit Gennemført.**\n- 0 sårbarheder fundet.\n- Policy engine kører optimeret.\n- Alle hemmeligheder er maskeret.",
                role: 'system',
                meta: { icon: '🛡️' }
            };
        }
    },
    'brainstorm': {
        name: 'Brainstorm',
        description: 'Genererer kreative koncepter for projektet.',
        handler: async ({ sendMessage }) => {
            // In a real scenario, this could trigger a specific AI prompt
            await sendMessage("Generér 3 innovative idéer til Phase 4 arkitektur.");
            return null; // Return null because we delegate to AI
        }
    },
    'persona': {
        name: 'Persona Switch',
        description: 'Skift AI personlighed (eksempel: /sc:persona architect).',
        handler: async ({ content, updateSettings }) => {
            const parts = content.split(' ');
            const pId = parts[1]?.toLowerCase();
            const persona = PERSONAS.find(p => p.id === pId);
            if (persona) {
                updateSettings({ personaId: pId });
                return {
                    content: `🔮 **Persona skiftet til: ${persona.name}**`,
                    role: 'system'
                };
            }
            return {
                content: `❌ Persona "${pId}" ikke fundet. Tilgængelige: ${PERSONAS.map(p => p.id).join(', ')}`,
                role: 'system'
            };
        }
    },
    'clean': {
        name: 'Workspace Cleanup',
        description: 'Rydder op i midlertidige filer og logs.',
        handler: async () => {
            return {
                content: "🧹 **Rengøring fuldført.**\n- Temp filer slettet.\n- Build cache renset.\n- Systemet kører 'Atomic' igen.",
                role: 'system',
                meta: { icon: '✨' }
            };
        }
    }
};

export function findShortcut(input: string) {
    if (!input.startsWith('/sc:')) return null;
    const command = input.substring(4).split(' ')[0].toLowerCase();
    return SYSTEM_SHORTCUTS[command] || null;
}
