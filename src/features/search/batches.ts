import logger from "../../shared/logging/logger";
import { IPillData } from "../pills/pill_data.types";
import { PILL_DATA_COLUMNS, IUnifiedSearchData } from "./types";
import { getDocData } from "./documents";
import { generateUniqueContents } from "./contents";
import { upsert } from "./repository";
import { writeFailedData } from "./failed_records";
const BATCH_SIZE = 5;
async function createSearchRecord(pill: IPillData): Promise<IUnifiedSearchData> {
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
/** DB 배치 실패는 파일로 보존하여 이후 재시도할 수 있게 한다. */
async function saveBatch(records: IUnifiedSearchData[]): Promise<void> {
  try {
    await upsert(records);
  }
  catch (error) {
    logger.error("[UNIFIED-SEARCH] Failed to upsert batch. %s", error.stack || error);
    for (const record of records) {
      await writeFailedData(record);
    }
  }
}
async function processBatch(pills: IPillData[]): Promise<void> {
  const records: IUnifiedSearchData[] = [];
  for (const pill of pills) {
    records.push(await createSearchRecord(pill));
  }
  await saveBatch(records);
}
export async function upsertAll(pills: IPillData[]): Promise<void> {
  for (let start = 0; start < pills.length; start += BATCH_SIZE) {
    await processBatch(pills.slice(start, start + BATCH_SIZE));
  }
}
