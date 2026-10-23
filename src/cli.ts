#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { createInterface } from "node:readline"
import { createProxy, DEFAULT_URL } from "./proxy.js"

const HELP = `iyildirim: ask your AI agent about Izzet Yildirim's research, papers, and CV.

This is an MCP server over stdio. Add it to your agent's MCP config:

  { "mcpServers": { "iyildirim": { "command": "npx", "args": ["-y", "iyildirim"] } } }

Claude Code:  claude mcp add iyildirim -- npx -y iyildirim

Most clients can also connect straight to ${DEFAULT_URL}.
More: https://iyildirim.com/contact`

const arg = process.argv[2]
if (arg === "--help" || arg === "-h") {
  console.log(HELP)
  process.exit(0)
}
if (arg === "--version" || arg === "-v") {
  const pkg = new URL("../package.json", import.meta.url)
  console.log(JSON.parse(readFileSync(pkg, "utf8")).version)
  process.exit(0)
}
if (process.stdin.isTTY) {
  // Run by hand, nobody is speaking JSON-RPC: show how to use it instead.
  console.log(HELP)
  process.exit(0)
}

const handle = createProxy(process.env.IYILDIRIM_MCP_URL || DEFAULT_URL)
const pending = new Set<Promise<void>>()

// One JSON-RPC message per line. Requests run concurrently; replies are
// written as they finish, which JSON-RPC allows.
createInterface({ input: process.stdin })
  .on("line", (line) => {
    if (!line.trim()) return
    const job = handle(line)
      .then((reply) => {
        if (reply !== undefined) process.stdout.write(`${reply}\n`)
      })
      .finally(() => pending.delete(job))
    pending.add(job)
  })
  .on("close", async () => {
    await Promise.allSettled(pending)
  })
