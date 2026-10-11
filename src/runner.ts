import type { ResourceTask } from "./types/resource_tasks";
import logger from "./utils/logger";

/**
 * 단일 작업을 실행하고, 실패 시 오류를 기록한 뒤 성공 여부를 반환한다.
 */
async function runTask(task: ResourceTask) {
  try {
    // 단일 리소스 작업을 실행하고 결과를 반환한다.
    await task.execute();

    return true;
  } catch (e) {
    // 실패 원인을 기록하고 다음 작업을 계속할 수 있도록 실패 결과를 반환한다.
    logger.error("[%s] Task failed. %s", task.name, e.stack || e);

    return false;
  }
}

/**
 * 선택된 작업을 등록 순서대로 실행하고 모든 작업의 성공 여부를 반환한다.
 */
export async function runTasks(targets: string[], tasks: ResourceTask[]) {
  // 설정에 지정된 이름으로 실행할 작업을 추린다.
  const selectedNames = new Set(targets);
  const selectedTasks = tasks.filter((task) => selectedNames.has(task.name));
  let succeeded = true;

  // 선택한 작업을 순차 실행하면서 전체 성공 여부를 누적한다.
  for (const task of selectedTasks) {
    const taskSucceeded = await runTask(task);

    succeeded = taskSucceeded && succeeded;
  }

  // 하나라도 실패한 작업이 있으면 실패 결과를 반환한다.
  return succeeded;
}
