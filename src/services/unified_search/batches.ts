import { PILL_DATA_COLUMNS } from "./columns";
import logger from "../../utils/logger";
import { IPillData } from "../pill_data/types/pill_data";
import type { IUnifiedSearchData } from "./types/unified_search";
import { getDocData } from "./documents";
import { generateUniqueContents } from "./contents";
import { upsert } from "./repository";
import { writeFailedData } from "./failed_records";

const BATCH_SIZE = 5;

/**
 * 의약품 기본 정보와 문서 내용을 모아 통합 검색 레코드를 만든다.
 */
async function createSearchRecord(pill: IPillData) {
  const documents = await getDocData(pill.ITEM_SEQ);
  const values = [
    ...PILL_DATA_COLUMNS.map((column) => pill[column as keyof IPillData]),
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
 * DB 배치 실패는 파일로 보존하여 이후 재시도할 수 있게 한다.
 */
async function saveBatch(records: IUnifiedSearchData[]) {
  try {
    await upsert(records);
  } catch (e) {
    logger.error("[UNIFIED-SEARCH] Failed to upsert batch. %s", e.stack || e);

    for (const record of records) {
      await writeFailedData(record);
    }
  }
}

/**
 * 배치의 의약품을 검색 레코드로 변환한 뒤 일괄 저장한다.
 */
async function processBatch(pills: IPillData[]) {
  const records: IUnifiedSearchData[] = [];

  for (const pill of pills) {
    records.push(await createSearchRecord(pill));
  }

  await saveBatch(records);
}

/**
 * 의약품 목록을 정해진 배치 크기로 나누어 순차적으로 검색 DB에 반영한다.
 */
export async function upsertAll(pills: IPillData[]) {
  for (let start = 0; start < pills.length; start += BATCH_SIZE) {
    await processBatch(pills.slice(start, start + BATCH_SIZE));
  }
}
