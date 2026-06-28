import axios from "axios";
import fs from "fs";
import path from "path";
import config from "../../config.json";
import {
  logger,
  ResourceLoader,
  runQuery,
  normalizeText,
  createSQLFile,
  runQueryForSQLFile,
  getSafeValue,
  generateUniqueContents,
} from "../utils";
import { IUnifiedSearchData, IPillData, PILL_DATA_COLUMNS } from "../types";
import { createResourcesDirectory } from "../utils/shared";
import { createPillData } from "./pill_data";

const TARGET_DB = "wip_unified_search";

/**
 * 테이블 및 인덱스 / FTS5 생성
 */
function createTables() {
  // 메인 통합 검색 테이블 생성
  const createUnifiedSearchTable = () => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS unified_search (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        ITEM_SEQ TEXT UNIQUE,
        CONTENTS TEXT,
        createDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        updateDate DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
    runQuery(createTableQuery, TARGET_DB);
  };

  // FTS5 가상 테이블 생성
  const createUnifiedSearchFTSTable = () => {
    const createFTS5Query = `
      CREATE VIRTUAL TABLE IF NOT EXISTS unified_search_fts
      USING fts5 (
        CONTENTS,
        content='unified_search',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 0'
      )`;
    runQuery(createFTS5Query, TARGET_DB);
  };

  // 메인 테이블 INSERT 발생 시 FTS 테이블에도 INSERT를 수행하는 트리거 생성
  const createUnifiedSearchFTSInsertTrigger = () => {
    const createTriggerQuery = `
      CREATE TRIGGER IF NOT EXISTS unified_search_ai
      AFTER INSERT ON unified_search
      BEGIN
        INSERT INTO unified_search_fts(rowid, CONTENTS)
        VALUES (NEW.rowid, NEW.CONTENTS);
      END`;
    runQuery(createTriggerQuery, TARGET_DB);
  };

  /**
   * entry point
   */
  createUnifiedSearchTable();
  createUnifiedSearchFTSTable();
  createUnifiedSearchFTSInsertTrigger();
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
 * @param unifiedSearchDataList 통합 검색 데이터 배열
 * @returns
 */
export async function upsert(unifiedSearchDataList: IUnifiedSearchData[]) {
  if (unifiedSearchDataList.length === 0) {
    return;
  }

  const columnNames = ["ITEM_SEQ", "CONTENTS", "createDate", "updateDate"];
  const setClauses = `CONTENTS = excluded.CONTENTS`;

  const valuesClauses = unifiedSearchDataList.map(
    (data) =>
      `(${getSafeValue(data.ITEM_SEQ)}, ${getSafeValue(data.CONTENTS)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );

  let insertQuery = `
  INSERT INTO unified_search (
    ${columnNames.join(",\n    ")}
  ) VALUES 
    ${valuesClauses.join(",\n    ")}
  ON CONFLICT(ITEM_SEQ) DO UPDATE SET
    ${setClauses},
    updateDate = CURRENT_TIMESTAMP;
  `;

  createSQLFile("unified_search.sql", insertQuery);
  runQueryForSQLFile("unified_search.sql", TARGET_DB);
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
 * @param pillDataList 알약 데이터 목록
 */
async function upsertAll(pillDataList: IPillData[]) {
  // UPSERT 시도
  const tryUpsertBatch = async (upsertDataList: IUnifiedSearchData[]) => {
    try {
      await upsert(upsertDataList);
    } catch (e: any) {
      logger.error(
        "[UNIFIED-SEARCH] Failed to upsert batch data. error: %s",
        e.stack || e,
      );

      for (const upsertData of upsertDataList) {
        await writeFailedData(upsertData);
      }
    }
  };

  // 일정 개수씩 실행
  const processBatch = async (pillBatch: IPillData[]) => {
    const upsertDataList: IUnifiedSearchData[] = [];

    for (const pill of pillBatch) {
      const docData = await getDocData(pill.ITEM_SEQ);

      const rawDataArr = [
        ...PILL_DATA_COLUMNS.map((col) => (pill as any)[col]),
        docData.EE_DOC_DATA,
        docData.UD_DOC_DATA,
        docData.NB_DOC_DATA,
      ];

      upsertDataList.push({
        ITEM_SEQ: pill.ITEM_SEQ,
        CONTENTS: generateUniqueContents(rawDataArr),
      });
    }

    await tryUpsertBatch(upsertDataList);
  };

  /**
   * entry point
   */
  let batch: IPillData[] = [];

  for (const pill of pillDataList) {
    batch.push(pill);

    const batchSize = config.unifiedSearch?.batchSize || 10;
    if (batch.length >= batchSize) {
      await processBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await processBatch(batch);
  }
}

/**
 * DB에서 삭제된 아이템 제거
 * @param pillDataList 활성 알약 데이터 목록
 */
async function deleteRemovedItems(pillDataList: IPillData[]) {
  if (!pillDataList?.length) {
    return;
  }

  const idList = pillDataList.map((p) => `'${p.ITEM_SEQ}'`).join(",");
  const query = `DELETE FROM unified_search WHERE ITEM_SEQ NOT IN (${idList});`;

  createSQLFile("unified_search_delete.sql", query);

  try {
    runQueryForSQLFile("unified_search_delete.sql", TARGET_DB);

    logger.info("[UNIFIED-SEARCH] Successfully deleted removed items");
  } catch (e: any) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to delete removed items. %s",
      e.stack || e,
    );
  }
}

/**
 * 통합 검색 DB 업데이트
 * @param dbInitialize DB 테이블 재생성(초기화) 여부
 */
export async function updateUnifiedSearchDB(dbInitialize: boolean = false) {
  try {
    logger.info("[UNIFIED-SEARCH] Start load resource");

    const resourceLoader = new ResourceLoader([
      "drug_recognition",
      "finished_medicine_permission_detail",
    ]);

    const resource = await resourceLoader.loadResource();

    logger.info("[UNIFIED-SEARCH] Complete load resource");

    logger.info("[UNIFIED-SEARCH] Start create pill data array");

    const pillDataList = createPillData(
      resource.drugRecognition,
      resource.finishedMedicinePermissionDetail,
    );

    logger.info("[UNIFIED-SEARCH] Complete create pill data array");

    logger.info("[UNIFIED-SEARCH] Start update search data");

    if (dbInitialize) {
      createTables();
    }

    await upsertAll(pillDataList);

    logger.info("[UNIFIED-SEARCH] Start delete removed items");
    await deleteRemovedItems(pillDataList);

    logger.info("[UNIFIED-SEARCH] Complete create pill data resource file");
  } catch (e: any) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to create pill data resource file. %s",
      e.stack || e,
    );
  }
}
