import type { ResourceTask } from "./types/resource_tasks";
import logger from "./utils/logger";
import { describeError } from "./utils/error_details";

/**
 * 단일 작업 실행
 */
async function runTask(task: ResourceTask) {
  const startedAt = Date.now();

  logger.info("[TASK] Started name=%s", task.name);

  try {
    // 단일 리소스 작업을 실행하고 결과를 반환
    await task.execute();

    logger.info(
      "[TASK] Completed name=%s durationMs=%s",
      task.name,
      Date.now() - startedAt,
    );

    return true;
  } catch (error) {
    // 실패 원인을 기록하고 다음 작업을 계속할 수 있도록 실패 결과를 반환
    logger.error(
      "[TASK] Failed name=%s durationMs=%s reason=%s",
      task.name,
      Date.now() - startedAt,
      describeError(error),
    );

    return false;
  }
}

/**
 * 선택 작업 순차 실행
 */
export async function runTasks(targets: string[], tasks: ResourceTask[]) {
  // 설정에 지정된 이름으로 실행할 작업을 선택
  const selectedNames = new Set(targets);
  const selectedTasks = tasks.filter((task) => selectedNames.has(task.name));
  let succeeded = true;
  let completedCount = 0;
  const startedAt = Date.now();

  logger.info(
    "[TASK] Run started selected=%s names=%s",
    selectedTasks.length,
    selectedTasks.map((task) => task.name).join(","),
  );

  // 선택한 작업을 순차 실행하면서 전체 성공 여부를 누적
  for (const task of selectedTasks) {
    const taskSucceeded = await runTask(task);

    succeeded = taskSucceeded && succeeded;
    completedCount += Number(taskSucceeded);
  }

  // 하나라도 실패한 작업이 있으면 실패 결과를 반환
  logger.info(
    "[TASK] Run completed total=%s succeeded=%s failed=%s durationMs=%s",
    selectedTasks.length,
    completedCount,
    selectedTasks.length - completedCount,
    Date.now() - startedAt,
  );

  return succeeded;
}
