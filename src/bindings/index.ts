import { z } from "zod";

/**
 * Bindings are host functions the agent can call from inside its VM.
 * Each group is exposed as a CLI command at /usr/local/bin/agentos-{name},
 * so the agent literally runs `agentos-notes save --title ...` in its shell,
 * and the `execute` handler runs here on the host with YOUR credentials
 * and YOUR access — the agent never sees them.
 *
 * This demo group is a self-contained in-memory notes store so the template
 * runs with zero external services. Swap it for real integrations:
 * database queries, internal APIs, Slack messages, whatever your backend does.
 */

const notes = new Map<string, string>();

export const notesBindings = {
  name: "notes",
  description: "Save and retrieve notes on the host",
  bindings: {
    save: {
      description: "Save a note under a title",
      inputSchema: z.object({
        title: z.string().describe("Note title (unique key)"),
        body: z.string().describe("Note content"),
      }),
      execute: async (input: { title: string; body: string }) => {
        notes.set(input.title, input.body);
        return { saved: true, title: input.title };
      },
      examples: [
        {
          description: "Save a shopping list",
          input: { title: "groceries", body: "eggs, milk, coffee" },
        },
      ],
    },
    list: {
      description: "List all saved note titles",
      inputSchema: z.object({}),
      execute: async () => ({ titles: [...notes.keys()] }),
    },
    read: {
      description: "Read a note by title",
      inputSchema: z.object({
        title: z.string().describe("Note title to read"),
      }),
      execute: async (input: { title: string }) => ({
        title: input.title,
        body: notes.get(input.title) ?? null,
      }),
    },
  },
};
