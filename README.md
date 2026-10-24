# iyildirim

[![npm](https://img.shields.io/npm/v/iyildirim)](https://www.npmjs.com/package/iyildirim)

An [MCP](https://modelcontextprotocol.io) server for [Izzet Yildirim](https://iyildirim.com). Connect it to your AI agent and ask about his research, papers, CV, and availability.

It is read-only and needs no sign-in. It answers from the public data on [iyildirim.com](https://iyildirim.com), including the full text of his published papers.

## Connect

**Claude Code**

```sh
claude mcp add iyildirim -- npx -y iyildirim
```

**Claude Desktop, Cursor, VS Code, Windsurf** (any client that launches local servers): add to the MCP config.

```json
{
  "mcpServers": {
    "iyildirim": { "command": "npx", "args": ["-y", "iyildirim"] }
  }
}
```

**No install:** most clients can connect straight to the hosted server, which is what this package forwards to.

```sh
claude mcp add --transport http iyildirim https://iyildirim.com/api/mcp
```

Claude, ChatGPT, and Cursor also accept `https://iyildirim.com/api/mcp` as a custom connector URL.

## Then ask

> What has Izzet published on I/O tracing?
>
> Read the system design section of the AgentStage paper and summarize it.
>
> Is Izzet a fit for this role? (paste a job description)

## Tools

| Tool                  | What it does                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| `get_cv_section`      | One section of his CV: experience, education, service, certifications, or skills |
| `get_paper_section`   | The text of one section of a public paper                                        |
| `get_profile`         | Start here: overview, what he is looking for, contact, links                     |
| `get_publication`     | The catalog entry for one publication (summary, venue, abstract, links)          |
| `list_paper_sections` | The sections of a public paper                                                   |
| `search_paper_text`   | Search the full text of public papers for passages                               |
| `search_publications` | Search the publication catalog by topic, system, or venue                        |

Names follow one scheme: `search_` takes a query, `list_` enumerates the parts of one thing, `get_` fetches one thing. The server provides the list, so it can change; your agent always sees the current one.

## How it works

This package is a thin stdio-to-HTTP bridge. It holds no tools or data of its own: each message goes to `https://iyildirim.com/api/mcp` and the reply comes back unchanged, so the tools are always as current as the site. No dependencies.

Set `IYILDIRIM_MCP_URL` to point it at another endpoint, for example a preview deployment.

## Develop

```sh
npm install
npm run validate   # format check, types, tests, build
```

## Release

Releases are published to npm, and then listed in the [official MCP registry](https://registry.modelcontextprotocol.io) as `io.github.izzet/mcp`, by [`publish.yml`](.github/workflows/publish.yml) when a version tag is pushed.

1. Bump `version` in `package.json` and in `server.json` (both `version` and `packages[0].version`) in a pull request and merge it. A test and the workflow check that they match.
2. On `main`: `git tag v0.1.1 && git push origin v0.1.1` (the tag must match the version).

To rehearse, run the workflow from the Actions tab: a manual run only does an npm dry run and validates `server.json`.

The registry login uses GitHub OIDC, so it needs no secret.

Publishing needs either a trusted publisher configured for this repo and `publish.yml` on npmjs.com (no secret), or an `NPM_TOKEN` repository secret.

MIT licensed.
