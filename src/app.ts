import { loadConfig } from "./application/config";
import { createResourceTasks } from "./application/tasks";
import { runTasks } from "./application/runner";

async function main(): Promise<void> {
  const config = loadConfig();
  const succeeded = await runTasks(
    config.common.targetResource,
    createResourceTasks(config),
  );
  process.exitCode = succeeded ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
