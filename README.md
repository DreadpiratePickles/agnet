# agnet

**Persistent, sandboxed AI agents running inside your own backend — no containers, no microVMs, no per-sandbox cloud bill.**

`agnet` is a starter template built on [AgentOS](https://github.com/rivet-dev/agentos), a lightweight virtual machine runtime for AI agents. Each agent gets what *looks like* a full computer — a filesystem, a shell, processes, pipes, a network stack — but it's all emulated in-process on V8 isolates and WebAssembly. The result, per AgentOS's benchmarks: **~92x faster cold starts, ~47x less memory, and ~254x cheaper** than traditional sandboxes.

This repo is deliberately a skeleton. It runs end-to-end today, and it's structured so every piece — agents, bindings, permissions, clients — has an obvious place to grow.

---

## Why this architecture

The expensive part of running agents in production isn't the LLM calls — it's the sandbox. The conventional approach boots a full Linux environment (Docker, Firecracker, E2B) per agent: seconds of cold start, hundreds of MB each, real per-hour cost. AgentOS's bet is that agents don't need a real OS, just something that behaves like one:

```
┌─────────────────────────────────────────────────────┐
│                 Your Node.js process                │
│                                                     │
│  ┌───────────────┐   ┌───────────────────────────┐  │
│  │  Your code    │   │  Trusted sidecar          │  │
│  │  server.ts    │   │  (virtual kernel: fs,     │  │
│  │  bindings     │◄──┤   process table, pipes,   │  │
│  │  clients      │   │   PTYs, network stack)    │  │
│  └───────────────┘   └────────────┬──────────────┘  │
│                                   │                 │
│                      ┌────────────▼──────────────┐  │
│                      │  Agent VMs (V8 isolates   │  │
│                      │  + Wasm) — one per agent, │  │
│                      │  hundreds per host        │  │
│                      └───────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Nothing the guest does touches the host directly — no real filesystem, no real sockets, no real processes. But because a VM is just an isolate plus sidecar state, agents become as cheap as web requests: per-user agents, agent-per-ticket, agent-per-document all become economically sane.

Three ideas in this template are worth understanding before you extend it:

1. **VMs are named and persistent.** `client.vm.getOrCreate("agent-for-user-123")` returns the same VM — same filesystem, same transcript — every time. Session state and replay come for free.
2. **Bindings are the integration model.** Instead of handing the agent raw API keys, you expose host functions as CLI commands inside the VM (`agentos-notes save ...`). The handler runs on the host with your credentials; the agent never sees them.
3. **Permissions are default-deny-capable.** Filesystem paths, network hosts, bindings, processes, and env vars can each be allowed/denied with glob rules per VM.

---

## Quickstart

**Prerequisites:** Node.js ≥ 20, an Anthropic API key.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env      # then put your ANTHROPIC_API_KEY in .env

# 3. Run the server (terminal 1)
npm run dev

# 4. Talk to your agent (terminal 2)
export $(grep -v '^#' .env | xargs) && npm run client
```

The demo client opens a session with the [Pi agent](https://www.npmjs.com/package/@agentos-software/pi), asks it to use the custom `notes` binding and write a file, streams every session event to your terminal, and reads the file back off the VM's durable filesystem.

---

## Project structure

```
agnet/
├── src/
│   ├── server.ts          # The AgentOS VM definition: agents, bindings, permissions
│   ├── client.ts          # Demo client: connect → open session → prompt → read files
│   └── bindings/
│       └── index.ts       # Host functions exposed to agents as in-VM CLI commands
├── .env.example           # Environment template (never commit .env)
├── package.json
└── tsconfig.json
```

**`src/server.ts`** — the heart of it. `agentOS({ software, bindings, permissions })` defines what a VM contains; `setup()` + `registry.start()` serve it on `:6420`. Add agents, tighten permissions, and register new binding groups here.

**`src/bindings/index.ts`** — a self-contained in-memory notes store, so the template runs with zero external services. Each binding declares a Zod input schema, a description, and an `execute` handler. This file is where your real integrations go: database queries, internal APIs, anything your backend can do.

**`src/client.ts`** — typed end-to-end via `createClient<typeof registry>`. Any frontend or backend service can be a client; this script is just the smallest possible one.

---

## Extending the skeleton

Things this template is set up to grow into (all supported by AgentOS today — see the [examples](https://github.com/rivet-dev/agentos/tree/main/examples)):

- [ ] **Real bindings** — replace the notes demo with your actual backend functions
- [ ] **Locked-down permissions** — flip `network` to default-deny with per-host allow rules (commented example in `server.ts`)
- [ ] **More agents** — Claude Code, Codex, and OpenCode adapters drop into `software: [...]`
- [ ] **Cron agents** — scheduled runs ("triage new tickets every 10 minutes")
- [ ] **Webhooks** — event-driven agents that wake on external triggers
- [ ] **Workflows** — durable multi-step chains with retries and branching
- [ ] **Agent-to-agent delegation** — agents spawning and coordinating other agents
- [ ] **Multiplayer** — multiple humans watching/steering one agent session live
- [ ] **Mounted filesystems** — S3, Google Drive, or host directories inside the VM
- [ ] **Auth** — custom authentication in front of the registry endpoint
- [ ] **A real frontend** — the typed client works from the browser

## Useful commands

```bash
npm run dev          # server with hot reload
npm run start        # server, no reload
npm run client       # run the demo client against a running server
npm run typecheck    # tsc --noEmit
```

## Honest caveats

- AgentOS is young; APIs may shift. Pin versions before depending on this in anger.
- "No real OS" means tools expecting genuine Linux internals may need AgentOS's sandbox-mounting escape hatch.
- V8 isolates are a weaker security boundary than hardware virtualization — right for semi-trusted agent code, wrong for arbitrary hostile binaries.

## References

- [AgentOS repo](https://github.com/rivet-dev/agentos) · [Docs](https://agentos-sdk.dev/docs) · [Benchmarks](https://agentos-sdk.dev/docs/benchmarks) · [Registry of agents/software](https://agentos-sdk.dev/registry)

---

*Skeleton by design. The README is ahead of the code on purpose — it's the map for where this goes.*
