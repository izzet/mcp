import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { DEFAULT_URL } from "../src/proxy.js"

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"))
const pkg = read("package.json")
const server = read("server.json")

// The registry lists server.json, and checks it against the published package.
describe("server.json", () => {
  it("is named after the package's mcpName", () => {
    expect(server.name).toBe(pkg.mcpName)
    expect(server.name).toMatch(/^io\.github\.izzet\//)
  })

  it("lists this version of this npm package over stdio", () => {
    expect(server.version).toBe(pkg.version)
    expect(server.packages).toEqual([
      {
        registryType: "npm",
        identifier: pkg.name,
        version: pkg.version,
        transport: { type: "stdio" },
      },
    ])
  })

  it("lists the hosted endpoint the bridge forwards to", () => {
    expect(server.remotes).toEqual([
      { type: "streamable-http", url: DEFAULT_URL },
    ])
  })

  it("points at this repository", () => {
    expect(`git+${server.repository.url}.git`).toBe(pkg.repository.url)
  })
})
