import { agentOS, setup } from "@rivet-dev/agentos";
import type { Permissions } from "@rivet-dev/agentos";
import pi from "@agentos-software/pi";
import { notesBindings } from "./bindings/index.js";

/**
 * Permissions govern what the agent's VM can touch. Everything is virtual —
 * the guest never sees the real host filesystem, sockets, or processes —
 * but these rules control what the virtual kernel will allow.
 *
 * The template grants the network so the Pi agent can reach the Anthropic
 * API. To lock a VM down to specific hosts instead, use the rule form:
 *
 *   network: {
 *     default: "deny",
 *     rules: [{ mode: "allow", operations: ["*"], patterns: ["api.anthropic.com"] }],
 *   }
 *
 * fs, binding, process, and env accept the same default+rules shape.
 */
const permissions = {
  network: "allow",
} satisfies Permissions;

const vm = agentOS({
  software: [pi],
  bindings: [notesBindings],
  permissions,
});

export const registry = setup({ use: { vm } });
registry.start();

console.log("agnet server listening on http://localhost:6420");
