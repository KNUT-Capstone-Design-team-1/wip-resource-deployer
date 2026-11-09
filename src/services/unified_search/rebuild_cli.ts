import { rebuildFts5 } from "./rebuild";
import logger from "../../utils/logger";
import { describeError } from "../../utils/error_details";

rebuildFts5().catch((error: unknown) => {
  logger.error("[UNIFIED-SEARCH-FTS-REBUILD] Failed: %s", describeError(error));
  process.exitCode = 1;
});
