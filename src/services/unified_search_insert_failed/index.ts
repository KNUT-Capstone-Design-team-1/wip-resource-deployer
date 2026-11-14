import { createTables } from "../unified_search_create_tables";
import { verifyUnifiedSearch } from "../unified_search/verify";
import { upsert } from "../unified_search/repository";
import {
  listFailedDataFiles,
  readFailedData,
  removeFailedData,
} from "../unified_search/failed_records";
import logger from "../../utils/logger";
import { createSearchRecord } from "../unified_search/batches";
import { hasMissingDocuments } from "../unified_search/search_data";
import { readPillDataResource } from "../unified_search/pill_resource";
import type { SearchPill } from "../unified_search/types/unified_search";

/**
 * 검색 저장 실패 재시도
 */
async function upsertFailedRetry(
  filePath: string,
  pills: Map<string, SearchPill>,
) {
  try {
    const failed = await readFailedData(filePath);
    const pill = pills.get(failed.ITEM_SEQ);
    if (!pill) throw new Error("Missing pill resource: " + failed.ITEM_SEQ);
    // Never replay an older snapshot over a newer successful resource update.
    const record = await createSearchRecord(pill);

    await upsert([record]);
    if (hasMissingDocuments(record)) {
      throw new Error(
        "Document fetch incomplete; retained retry file: " + record.ITEM_SEQ,
      );
    }

    // DB 저장에 성공한 파일은 다음 레코드 처리 전에 즉시 제거
    await removeFailedData(filePath);

    logger.info(
      "[UNIFIED-SEARCH-UPSERT-FAILED] Upserted and removed file=%s",
      filePath,
    );

    return true;
  } catch (error: any) {
    logger.error(
      `[UNIFIED-SEARCH-UPSERT-FAILED] Failed to retry or remove file %s. error: %s`,
      filePath,
      error.stack || error,
    );

    return false;
  }
}

/**
 * 전체 검색 실패 재시도
 */
export async function upsertFailedRetryAll() {
  const files = await listFailedDataFiles();
  const pills = new Map(
    (await readPillDataResource()).map((pill) => [pill.ITEM_SEQ, pill]),
  );

  // 성공한 파일은 즉시 삭제하고 처리 완료 건수만 집계
  await createTables();
  let succeededCount = 0;

  for (const filePath of files) {
    const succeeded = await upsertFailedRetry(filePath, pills);

    if (succeeded) {
      succeededCount += 1;
    }
  }

  // FTS는 UPSERT 시 DB 트리거가 자동 동기화
  logger.info(
    "[UNIFIED-SEARCH-UPSERT-FAILED] Completed total=%s succeeded=%s failed=%s",
    files.length,
    succeededCount,
    files.length - succeededCount,
  );
  if (succeededCount !== files.length)
    throw new Error("Search retry incomplete; failed files retained");
  await verifyUnifiedSearch();
}
