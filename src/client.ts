import { createClient } from "@rivet-dev/agentos/client";
import type { registry } from "./server.js";

/**
 * A minimal client: connect to a VM by name (created on first use, persistent
 * after that), open a Pi agent session, stream its events, and send a prompt.
 *
 * Run the server first (`npm run dev`), then `npm run client`.
 */

const client = createClient<typeof registry>({
  endpoint: "http://localhost:6420",
});

// VMs are addressed by name — same name, same VM, same state. This is what
// makes per-user / per-task agents cheap: "agent-for-user-123" just works.
const handle = client.vm.getOrCreate("my-first-agent");

const conn = handle.connect();
conn.on("sessionEvent", (event) => {
  console.log(JSON.stringify(event, null, 2));
});

await handle.openSession({
  agent: "pi",
  env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY! },
});

await handle.prompt({
  content: [
    {
      type: "text",
      text: "Use the agentos-notes CLI to save a note titled 'hello' with body 'agnet is alive', then list all notes and show me the result. Also write a hello world script to /workspace/hello.js.",
    },
  ],
});

// The VM's filesystem is durable — read back what the agent produced.
const content = await handle.readFile("/workspace/hello.js");
console.log("--- /workspace/hello.js ---");
console.log(new TextDecoder().decode(content));
