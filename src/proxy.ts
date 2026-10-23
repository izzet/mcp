export const DEFAULT_URL = "https://iyildirim.com/api/mcp"

type Json = Record<string, unknown>

/** A JSON-RPC error reply for request `id`, so the agent sees why instead of hanging. */
const failure = (id: unknown, message: string): Json => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code: -32000, message },
})

/**
 * Forwards MCP messages from a local client to the remote server. It holds no
 * tool definitions of its own: tools and instructions are whatever the site says.
 */
export function createProxy(url: string = DEFAULT_URL) {
  // Echoed back on later requests, as the Streamable HTTP spec asks.
  let protocolVersion: string | undefined

  /**
   * Handles one line from the client. Returns the line to write back, or
   * undefined when there is nothing to say (notifications).
   */
  return async function handle(line: string): Promise<string | undefined> {
    let message: unknown
    try {
      message = JSON.parse(line)
    } catch {
      return JSON.stringify(failure(null, "Invalid JSON."))
    }
    const request = message as Json
    const id = request?.id

    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(protocolVersion && { "Mcp-Protocol-Version": protocolVersion }),
        },
        body: line,
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      return id === undefined
        ? undefined
        : JSON.stringify(
            failure(
              id,
              `Could not reach ${url} (${reason}). Try again in a moment, or email iyildirim@iyildirim.com.`
            )
          )
    }

    // Notifications are answered with 202 and no body.
    if (id === undefined) return undefined

    const text = await response.text()
    if (!response.ok) {
      let detail = ""
      try {
        const message = (JSON.parse(text) as { error?: { message?: string } })
          .error?.message
        if (message) detail = `: ${message}`
      } catch {
        // Not JSON; the status alone will do.
      }
      return JSON.stringify(
        failure(id, `The server answered ${response.status}${detail}`)
      )
    }

    try {
      const body = JSON.parse(text) as { result?: { protocolVersion?: string } }
      if (request.method === "initialize" && body.result?.protocolVersion)
        protocolVersion = body.result.protocolVersion
    } catch {
      return JSON.stringify(failure(id, "The server sent an unreadable reply."))
    }
    return text.trim()
  }
}
