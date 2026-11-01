import { PILL_DATA_COLUMNS } from "./columns";
import logger from "../../utils/logger";
import type { SearchPill } from "./types/unified_search";
import type { IUnifiedSearchData } from "./types/unified_search";
import { getDocData } from "./documents";
import { generateUniqueContents } from "./contents";
import { upsert } from "./repository";
import { writeFailedData } from "./failed_records";

const BATCH_SIZE = 5;

/**
 * 검색 레코드 생성
 */
async function createSearchRecord(pill: SearchPill) {
  const documents = await getDocData(pill.ITEM_SEQ);
  const values = [
    ...PILL_DATA_COLUMNS.map((column) => pill[column]),
    documents.EE_DOC_DATA,
    documents.UD_DOC_DATA,
    documents.NB_DOC_DATA,
  ];

  return {
    ITEM_SEQ: pill.ITEM_SEQ,
    CONTENTS: generateUniqueContents(values),
  };
}

/**
 * 검색 배치 저장·실패 기록
 */
async function saveBatch(records: IUnifiedSearchData[]) {
  try {
    await upsert(records);
  } catch (error) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to upsert batch. %s",
      error.stack || error,
    );

    for (const record of records) {
      await writeFailedData(record);
    }
  }
}

/**
 * 검색 배치 변환·저장
 */
async function processBatch(pills: SearchPill[]) {
  const records: IUnifiedSearchData[] = [];

  for (const pill of pills) {
    records.push(await createSearchRecord(pill));
  }

  await saveBatch(records);
}

/**
 * 전체 검색 데이터 저장
 */
export async function upsertAll(pills: SearchPill[]) {
  for (let start = 0; start < pills.length; start += BATCH_SIZE) {
    await processBatch(pills.slice(start, start + BATCH_SIZE));
  }
}
