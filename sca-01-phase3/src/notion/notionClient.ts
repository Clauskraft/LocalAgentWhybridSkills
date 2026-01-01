/**
 * Notion Integration Client
 * Synkroniserer sessions og blackboard til Notion
 */
import { Client } from "@notionhq/client";
import type {
  CreatePageResponse,
  UpdatePageResponse,
  PageObjectResponse,
  BlockObjectRequest,
} from "@notionhq/client/build/src/api-endpoints.js";

export interface NotionConfig {
  apiKey: string;
  databaseId: string; // Sessions database
  blackboardPageId?: string; // Blackboard page for HANDOVER_LOG
}

export interface SessionPage {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  lastMessage?: string;
  messageCount: number;
  notionPageId?: string;
}

export interface NotionSyncResult {
  success: boolean;
  notionPageId?: string;
  error?: string;
}

export class NotionClient {
  private client: Client;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.client = new Client({ auth: config.apiKey });
  }

  /**
   * Verificer forbindelse til Notion
   */
  async verifyConnection(): Promise<{ ok: boolean; user?: string; error?: string }> {
    try {
      const response = await this.client.users.me({});
      return {
        ok: true,
        user: response.name ?? response.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: msg };
    }
  }

  /**
   * Opret en session-side i Notion database
   */
  async createSessionPage(session: SessionPage): Promise<NotionSyncResult> {
    try {
      const response: CreatePageResponse = await this.client.pages.create({
        parent: { database_id: this.config.databaseId },
        properties: {
          // Title property (required)
          Name: {
            title: [
              {
                text: { content: session.title },
              },
            ],
          },
          // Custom properties
          SessionID: {
            rich_text: [
              {
                text: { content: session.id },
              },
            ],
          },
          Model: {
            select: {
              name: session.model,
            },
          },
          CreatedAt: {
            date: {
              start: session.createdAt,
            },
          },
          MessageCount: {
            number: session.messageCount,
          },
        },
        children: this.buildSessionContent(session),
      });

      return {
        success: true,
        notionPageId: response.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: msg };
    }
  }

  /**
   * Opdater en eksisterende session-side
   */
  async updateSessionPage(
    notionPageId: string,
    session: SessionPage
  ): Promise<NotionSyncResult> {
    try {
      const _response: UpdatePageResponse = await this.client.pages.update({
        page_id: notionPageId,
        properties: {
          Name: {
            title: [
              {
                text: { content: session.title },
              },
            ],
          },
          MessageCount: {
            number: session.messageCount,
          },
        },
      });

      return { success: true, notionPageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: msg };
    }
  }

  /**
   * Tilføj en besked til session-siden
   */
  async appendMessage(
    notionPageId: string,
    role: "user" | "assistant" | "system",
    content: string
  ): Promise<NotionSyncResult> {
    try {
      const roleEmoji = role === "user" ? "👤" : role === "assistant" ? "🤖" : "⚙️";
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

      await this.client.blocks.children.append({
        block_id: notionPageId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: { content: `${roleEmoji} ${role.toUpperCase()} - ${timestamp}` },
                },
              ],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: content.slice(0, 2000) }, // Notion limit
                },
              ],
            },
          },
          {
            object: "block",
            type: "divider",
            divider: {},
          },
        ],
      });

      return { success: true, notionPageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: msg };
    }
  }

  /**
   * Synkroniser HANDOVER_LOG til Notion blackboard
   */
  async syncBlackboard(markdownContent: string): Promise<NotionSyncResult> {
    if (!this.config.blackboardPageId) {
      return { success: false, error: "Blackboard page ID not configured" };
    }

    try {
      // Slet eksisterende indhold
      const existingBlocks = await this.client.blocks.children.list({
        block_id: this.config.blackboardPageId,
        page_size: 100,
      });

      for (const block of existingBlocks.results) {
        if ("id" in block) {
          await this.client.blocks.delete({ block_id: block.id });
        }
      }

      // Tilføj nyt indhold
      const blocks = this.markdownToBlocks(markdownContent);
      await this.client.blocks.children.append({
        block_id: this.config.blackboardPageId,
        children: blocks,
      });

      return { success: true, notionPageId: this.config.blackboardPageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: msg };
    }
  }

  /**
   * Hent alle sessions fra Notion database
   */
  async listSessions(): Promise<SessionPage[]> {
    try {
      // Use search to query pages in database
      const response = await this.client.search({
        filter: {
          property: "object",
          value: "page",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      });

      return response.results
        .filter((page): page is PageObjectResponse => 
          "properties" in page && 
          "parent" in page && 
          page.parent.type === "database_id" &&
          page.parent.database_id.replace(/-/g, "") === this.config.databaseId.replace(/-/g, "")
        )
        .map((page: PageObjectResponse) => this.pageToSession(page));
    } catch (err) {
      console.error("Failed to list sessions from Notion:", err);
      return [];
    }
  }

  // ===== Private helpers =====

  private buildSessionContent(session: SessionPage): BlockObjectRequest[] {
    return [
      {
        object: "block",
        type: "callout",
        callout: {
          icon: { emoji: "🤖" },
          rich_text: [
            {
              type: "text",
              text: {
                content: `Model: ${session.model} | Session ID: ${session.id}`,
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "📝 Conversation" },
            },
          ],
        },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
    ];
  }

  private markdownToBlocks(markdown: string): BlockObjectRequest[] {
    const lines = markdown.split("\n");
    const blocks: BlockObjectRequest[] = [];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        blocks.push({
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [{ type: "text", text: { content: line.slice(2) } }],
          },
        });
      } else if (line.startsWith("## ")) {
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: line.slice(3) } }],
          },
        });
      } else if (line.startsWith("### ")) {
        blocks.push({
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ type: "text", text: { content: line.slice(4) } }],
          },
        });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: line.slice(2) } }],
          },
        });
      } else if (line.startsWith("---")) {
        blocks.push({
          object: "block",
          type: "divider",
          divider: {},
        });
      } else if (line.trim()) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: line } }],
          },
        });
      }
    }

    return blocks;
  }

  private pageToSession(page: PageObjectResponse): SessionPage {
    const props = page.properties;

    // Extract title
    let title = "Untitled";
    if ("Name" in props && props.Name.type === "title") {
      title = props.Name.title.map((t) => t.plain_text).join("") || "Untitled";
    }

    // Extract SessionID
    let sessionId = page.id;
    if ("SessionID" in props && props.SessionID.type === "rich_text") {
      sessionId = props.SessionID.rich_text.map((t) => t.plain_text).join("") || page.id;
    }

    // Extract Model
    let model = "unknown";
    if ("Model" in props && props.Model.type === "select" && props.Model.select) {
      model = props.Model.select.name;
    }

    // Extract CreatedAt
    let createdAt = page.created_time;
    if ("CreatedAt" in props && props.CreatedAt.type === "date" && props.CreatedAt.date) {
      createdAt = props.CreatedAt.date.start;
    }

    // Extract MessageCount
    let messageCount = 0;
    if ("MessageCount" in props && props.MessageCount.type === "number") {
      messageCount = props.MessageCount.number ?? 0;
    }

    return {
      id: sessionId,
      title,
      model,
      createdAt,
      messageCount,
      notionPageId: page.id,
    };
  }
}

// Singleton instance
let notionClient: NotionClient | null = null;

export function getNotionClient(): NotionClient | null {
  if (notionClient) return notionClient;

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return null;
  }

  notionClient = new NotionClient({
    apiKey,
    databaseId,
    blackboardPageId: process.env.NOTION_BLACKBOARD_PAGE_ID,
  });

  return notionClient;
}

