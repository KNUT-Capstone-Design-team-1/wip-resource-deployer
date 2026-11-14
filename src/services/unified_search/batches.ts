import logger from "../../utils/logger";
import type { SearchPill } from "./types/unified_search";
import type { IUnifiedSearchData } from "./types/unified_search";
import { getDocData } from "./documents";
import { upsert } from "./repository";
import { writeFailedData } from "./failed_records";
import { buildMetadata, hasMissingDocuments } from "./search_data";

const BATCH_SIZE = 5;
// Each pill fetches at most three documents concurrently: at most nine requests.
const DOCUMENT_CONCURRENCY = 3;

/**
 * 검색 레코드 생성
 */
export async function createSearchRecord(
  pill: SearchPill,
): Promise<IUnifiedSearchData> {
  const documents = await getDocData(pill.ITEM_SEQ);

  return {
    ITEM_SEQ: pill.ITEM_SEQ,
    ...buildMetadata(pill),
    INDICATION_TEXT: documents.EE_DOC_DATA,
    USAGE_TEXT: documents.UD_DOC_DATA,
    WARNING_TEXT: documents.NB_DOC_DATA,
  };
}

/**
 * 검색 배치 저장·실패 기록
 */
async function saveBatch(records: IUnifiedSearchData[]) {
  try {
    await upsert(records);
    for (const record of records.filter(hasMissingDocuments)) {
      await writeFailedData(record);
    }
    return records.filter(hasMissingDocuments).length;
  } catch (error) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to upsert batch. %s",
      error.stack || error,
    );

    for (const record of records) {
      await writeFailedData(record);
    }
    return records.length;
  }
}

/**
 * 검색 배치 변환·저장
 */
async function processBatch(pills: SearchPill[]) {
  const records: IUnifiedSearchData[] = [];

  for (let start = 0; start < pills.length; start += DOCUMENT_CONCURRENCY) {
    records.push(
      ...(await Promise.all(
        pills
          .slice(start, start + DOCUMENT_CONCURRENCY)
          .map(createSearchRecord),
      )),
    );
  }

  return saveBatch(records);
}

/**
 * 전체 검색 데이터 저장
 */
export async function upsertAll(pills: SearchPill[]) {
  let failed = 0;
  for (let start = 0; start < pills.length; start += BATCH_SIZE) {
    failed += await processBatch(pills.slice(start, start + BATCH_SIZE));
  }
  if (failed)
    throw new Error(
      `Search update incomplete: ${failed} records; enable unified_search_insert_failed in config.json and run yarn start`,
    );
}
