import { loadConfig } from "./config";
import { createResourceTasks } from "./tasks";
import { runTasks } from "./runner";

/**
 * 리소스 작업 실행
 */
async function main() {
  // 설정 파일을 읽어 실행할 리소스 목록을 가져온다.
  const config = loadConfig();

  // 등록된 작업 중 선택한 리소스 작업을 순서대로 실행
  const succeeded = await runTasks(
    config.common.targetResource,
    createResourceTasks(config),
  );

  // 전체 작업의 성공 여부를 프로세스 종료 코드에 반영
  process.exitCode = succeeded ? 0 : 1;
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
