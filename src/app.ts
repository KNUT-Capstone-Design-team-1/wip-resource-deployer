import { loadConfig } from "./application/config";
import { createResourceTasks } from "./application/tasks";
import { runTasks } from "./application/runner";

/** 설정을 읽고 선택한 리소스 작업을 실행한 뒤 성공 여부를 종료 코드에 반영한다. */
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
