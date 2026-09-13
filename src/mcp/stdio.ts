import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveStoreDir } from "../core/paths.ts";
import { createServer } from "./server.ts";

// Start the MCP server over stdio. Runs until the client closes the transport.
export async function startStdioServer(): Promise<void> {
  const { dir } = resolveStoreDir();
  const server = createServer({ storeDir: dir });
  await server.connect(new StdioServerTransport());
}
