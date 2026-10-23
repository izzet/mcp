import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createProxy } from "../src/proxy.js"

type Seen = { headers: Record<string, unknown>; body: string }

let server: Server
let url: string
let seen: Seen[] = []
let reply: (body: string) => { status: number; text: string }

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      seen.push({ headers: req.headers, body })
      const { status, text } = reply(body)
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(text)
    })
  })
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/mcp`
})
afterAll(() => new Promise((ok) => server.close(ok)))
beforeEach(() => {
  seen = []
  reply = (body) => ({
    status: 200,
    text: JSON.stringify({
      jsonrpc: "2.0",
      id: JSON.parse(body).id,
      result: {},
    }),
  })
})

const rpc = (id: number, method: string) =>
  JSON.stringify({ jsonrpc: "2.0", id, method })

describe("proxy", () => {
  it("forwards a request unchanged and returns the reply", async () => {
    const handle = createProxy(url)
    const out = await handle(rpc(1, "tools/list"))
    expect(JSON.parse(out!)).toEqual({ jsonrpc: "2.0", id: 1, result: {} })
    expect(seen[0]?.body).toBe(rpc(1, "tools/list"))
    expect(seen[0]?.headers["accept"]).toContain("application/json")
  })

  it("stays silent for notifications", async () => {
    reply = () => ({ status: 202, text: "" })
    const handle = createProxy(url)
    const out = await handle(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
    )
    expect(out).toBeUndefined()
  })

  it("echoes the negotiated protocol version on later requests", async () => {
    reply = (body) => ({
      status: 200,
      text: JSON.stringify({
        jsonrpc: "2.0",
        id: JSON.parse(body).id,
        result: { protocolVersion: "2025-06-18" },
      }),
    })
    const handle = createProxy(url)
    await handle(rpc(1, "initialize"))
    await handle(rpc(2, "tools/list"))
    expect(seen[0]?.headers["mcp-protocol-version"]).toBeUndefined()
    expect(seen[1]?.headers["mcp-protocol-version"]).toBe("2025-06-18")
  })

  it("turns an HTTP error into a JSON-RPC error for that request", async () => {
    reply = () => ({
      status: 429,
      text: JSON.stringify({ error: { message: "Rate limit reached." } }),
    })
    const out = JSON.parse((await createProxy(url)(rpc(7, "tools/list")))!)
    expect(out.id).toBe(7)
    expect(out.error.message).toBe(
      "The server answered 429: Rate limit reached."
    )
  })

  it("reports an unreachable server instead of hanging", async () => {
    const out = JSON.parse(
      (await createProxy("http://127.0.0.1:9/api/mcp")(rpc(3, "tools/list")))!
    )
    expect(out.id).toBe(3)
    expect(out.error.message).toContain("Could not reach")
  })

  it("rejects lines that are not JSON", async () => {
    const out = JSON.parse((await createProxy(url)("not json"))!)
    expect(out.error.message).toBe("Invalid JSON.")
    expect(seen).toHaveLength(0)
  })
})
