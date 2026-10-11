import logger from "../shared/logging/logger";
import { ResourceTask } from "./tasks";
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
