import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLocalLighthouseMcpServer } from "./localServer";

export { createLocalVoterKeyStore } from "./localServer";

export const runMcpStdioRuntime = async (
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> => {
  const server = await createLocalLighthouseMcpServer(env);
  if (server === null) {
    return 1;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const closeServer = async () => {
    try {
      await server.close();
    } catch {
      // Ignore cleanup failures on process termination.
    }
  };

  process.on("SIGINT", () => {
    void closeServer().then(() => {
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    void closeServer().then(() => {
      process.exit(0);
    });
  });

  return 0;
};
