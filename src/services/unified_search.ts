import axios from "axios";
import fs from "fs";
import path from "path";
import {
  logger,
  mergeDuplicateObjectArray,
  ResourceLoader,
  runQuery,
  normalizeText,
  createSQLFile,
  runQueryForSQLFile,
} from "../utils";
import { IDrugRecognition, IFinishedMedicinePermissionDetail, IUnifiedSearchData } from "../types";
import { createResourcesDirectory } from "../utils/shared";

/**
 * 테이블 및 인덱스 / FTS5 생성
 */
function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS unified_search (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      ITEM_SEQ TEXT UNIQUE,
      EE_DOC_DATA TEXT,
      UD_DOC_DATA TEXT,
      NB_DOC_DATA TEXT,
      createDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      updateDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;
  runQuery(createTableQuery);

  try {
    runQuery(`ALTER TABLE unified_search ADD COLUMN IF NOT EXISTS createDate DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) {
    // Column might already exist or IF NOT EXISTS syntax error
  }
  
  try {
    runQuery(`ALTER TABLE unified_search ADD COLUMN IF NOT EXISTS updateDate DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) {
    // Column might already exist or IF NOT EXISTS syntax error
  }

  const createFTS5Query = `
    CREATE VIRTUAL TABLE IF NOT EXISTS unified_search_fts
    USING fts5 (
      EE_DOC_DATA,
      UD_DOC_DATA,
      NB_DOC_DATA,
      content='unified_search',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 0'
    )`;
  runQuery(createFTS5Query);

  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS unified_search_ai
    AFTER INSERT ON unified_search
    BEGIN
      INSERT INTO unified_search_fts(rowid, EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA)
      VALUES (NEW.rowid, NEW.EE_DOC_DATA, NEW.UD_DOC_DATA, NEW.NB_DOC_DATA);
    END`;
  runQuery(createTriggerQuery);
}

/**
 * 알약 데이터 ID 목록만 반환
 * @param drugRecognition 의약품 낱알식별정보 데이터
 * @param finishedMedicinePermission 완제 의약품 허가 상세 데이터
 * @returns
 */
function getPillDataIDs(
  drugRecognition: Array<IDrugRecognition>,
  finishedMedicinePermission: Array<IFinishedMedicinePermissionDetail>,
) {
  const mergedDrugRecognition = mergeDuplicateObjectArray(
    "ITEM_SEQ",
    drugRecognition,
  );

  const pillDataIDs: string[] = [];

  for (let i = 0; i < mergedDrugRecognition.length; i += 1) {
    const drug = mergedDrugRecognition[i];

    const finished = finishedMedicinePermission.find(
      ({ ITEM_SEQ }) => drug.ITEM_SEQ === ITEM_SEQ,
    );

    if (!finished) {
      continue;
    }

    pillDataIDs.push(drug.ITEM_SEQ);
  }

  return pillDataIDs;
}

/**
 * 통합 검색 문서 데이터 반환
 * 의약품 낱알식별 정보 데이터의 별도 문서 데이터를 의약품 안전나라에서 xml으로 받아온다
 * @param itemSeq 알약 ID
 * @returns
 */
async function getDocData(itemSeq: string) {
  const baseUrl = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}`;

  try {
    const EE = await axios.get<string>(`${baseUrl}/EE`);
    const UD = await axios.get<string>(`${baseUrl}/UD`);
    const NB = await axios.get<string>(`${baseUrl}/NB`);

    const nedrugData = {
      EE_DOC_DATA: normalizeText(EE.data),
      UD_DOC_DATA: normalizeText(UD.data),
      NB_DOC_DATA: normalizeText(NB.data),
    };

    logger.info("get data (%s)", itemSeq);

    return nedrugData;
  } catch (e) {
    logger.error("Failed to get doc data. item_seq: %s. %s", e.stack || e);

    return { EE_DOC_DATA: "", UD_DOC_DATA: "", NB_DOC_DATA: "" };
  }
}

/**
 * D1 DB에 UPSERT 수행
 * @param unifiedSearchData 통합 검색 데이터
 * @returns
 */
export async function upsert(unifiedSearchData: IUnifiedSearchData) {
  const { ITEM_SEQ, EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA } = unifiedSearchData;

  const safeItemSeq = typeof ITEM_SEQ === "string" ? `'${ITEM_SEQ.replace(/'/g, "''")}'` : ITEM_SEQ;
  const safeEE = typeof EE_DOC_DATA === "string" ? `'${EE_DOC_DATA.replace(/'/g, "''")}'` : EE_DOC_DATA;
  const safeUD = typeof UD_DOC_DATA === "string" ? `'${UD_DOC_DATA.replace(/'/g, "''")}'` : UD_DOC_DATA;
  const safeNB = typeof NB_DOC_DATA === "string" ? `'${NB_DOC_DATA.replace(/'/g, "''")}'` : NB_DOC_DATA;

  let insertQuery = `
  INSERT INTO unified_search (
    ITEM_SEQ, 
    EE_DOC_DATA, 
    UD_DOC_DATA, 
    NB_DOC_DATA,
    createDate,
    updateDate
  ) VALUES (${safeItemSeq}, ${safeEE}, ${safeUD}, ${safeNB}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(ITEM_SEQ) DO UPDATE SET
    EE_DOC_DATA = excluded.EE_DOC_DATA,
    UD_DOC_DATA = excluded.UD_DOC_DATA,
    NB_DOC_DATA = excluded.NB_DOC_DATA,
    updateDate = CURRENT_TIMESTAMP;
  `;

  createSQLFile("unified_search.sql", insertQuery);
  runQueryForSQLFile("unified_search.sql");
}

/**
 * UPSERT에 실패한 데이터를 JSON 파일로 생성
 * @param unifiedSearchData UPSERT에 실패한 데이터
 */
async function writeFailedData(unifiedSearchData: IUnifiedSearchData) {
  try {
    createResourcesDirectory();

    const resourceDirectoryName = "unified_search_insert_failed";

    const dirPath = path.resolve(
      __dirname,
      `../../resources/${resourceDirectoryName}`,
    );

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.resolve(
      dirPath,
      `${unifiedSearchData.ITEM_SEQ}.json`,
    );

    fs.writeFileSync(filePath, JSON.stringify(unifiedSearchData, null, 2));
  } catch (e) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to write failed data. error: %s",
      e.stack || e,
    );
  }
}

/**
 * 통합 검색 DB 업데이트
 * @param resource 리소스 데이터
 */
async function upsertAll(pillDataIDs: string[]) {
  for await (const itemSeq of pillDataIDs) {
    const docData = await getDocData(itemSeq);

    const upsertData = { ITEM_SEQ: itemSeq, ...docData };

    try {
      await upsert(upsertData);
    } catch (e) {
      logger.error(
        "[UNIFIED-SEARCH] Failed to upsert data. error: %s",
        e.stack || e,
      );

      await writeFailedData(upsertData);
    }
  }
}

/**
 * DB에서 삭제된 아이템 제거
 * @param pillDataIDs 활성 알약 데이터 ID 목록
 */
async function deleteRemovedItems(pillDataIDs: string[]) {
  if (!pillDataIDs || pillDataIDs.length === 0) return;

  const idList = pillDataIDs.map(id => `'${id}'`).join(',');
  const query = `DELETE FROM unified_search WHERE ITEM_SEQ NOT IN (${idList});`;
  
  createSQLFile("unified_search_delete.sql", query);
  
  try {
    runQueryForSQLFile("unified_search_delete.sql");
    logger.info("[UNIFIED-SEARCH] Successfully deleted removed items");
  } catch (e: any) {
    logger.error("[UNIFIED-SEARCH] Failed to delete removed items. %s", e.stack || e);
  }
}

/**
 * 통합 검색 DB 업데이트
 */
export async function updateUnifiedSearchDB() {
  try {
    logger.info("[UNIFIED-SEARCH] Start load resource");

    const resourceLoader = new ResourceLoader([
      "drug_recognition",
      "finished_medicine_permission_detail",
    ]);

    const resource = await resourceLoader.loadResource();

    logger.info("[UNIFIED-SEARCH] Complete load resource");

    logger.info("[UNIFIED-SEARCH] Start create pill data ID array");

    const pillDataIDs = getPillDataIDs(
      resource.drugRecognition,
      resource.finishedMedicinePermissionDetail,
    );

    logger.info("[UNIFIED-SEARCH] Complete create pill data ID array");

    logger.info("[UNIFIED-SEARCH] Start update search data");

    createTable();

    await upsertAll(pillDataIDs);

    logger.info("[UNIFIED-SEARCH] Start delete removed items");
    await deleteRemovedItems(pillDataIDs);

    logger.info("[UNIFIED-SEARCH] Complete create pill data resource file");
  } catch (e: any) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to create pill data resource file. %s",
      e.stack || e,
    );
  }
}
