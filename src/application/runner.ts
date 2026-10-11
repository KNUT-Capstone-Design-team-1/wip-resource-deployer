import logger from "../shared/logging/logger";
import { ResourceTask } from "./tasks";

/** 단일 작업을 실행하고, 실패 시 오류를 기록한 뒤 성공 여부를 반환한다. */
async function runTask(task: ResourceTask): Promise<boolean> {
  try {
    await task.execute();

    return true;
  }
  catch (error) {
    logger.error("[%s] Task failed. %s", task.name, error.stack || error);

    return false;
  }
}

/** 선택된 작업을 등록 순서대로 실행하고 모든 작업의 성공 여부를 반환한다. */
export async function runTasks(targets: string[], tasks: ResourceTask[]): Promise<boolean> {
  const selectedNames = new Set(targets);
  const selectedTasks = tasks.filter((task) => selectedNames.has(task.name));
  let succeeded = true;

  for (const task of selectedTasks) {
    const taskSucceeded = await runTask(task);
    succeeded = taskSucceeded && succeeded;
  }

  return succeeded;
}
