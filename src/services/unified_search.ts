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
  createResourcesDirectory,
} from "../utils";
import { IDrugRecognition, IFinishedMedicinePermissionDetail } from "../types";
import { IUnifiedSearchData } from "src/types/unified_search";

/**
 * 테이블 DROP
 */
function dropTable() {
  const dropTableQuery = `DROP TABLE IF EXISTS unified_search`;
  runQuery(dropTableQuery);

  const dropFTS5Query = `DROP TABLE IF EXISTS unified_search_fts`;
  runQuery(dropFTS5Query);
}

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
      NB_DOC_DATA TEXT
    )`;
  runQuery(createTableQuery);

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
    CREATE TRIGGER unified_search_ai
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
 * D1 DB에 insert 수행
 * @param unifiedSearchData 통합 검색 데이터
 * @returns
 */
export async function insert(unifiedSearchData: IUnifiedSearchData) {
  let insertQuery = `
  INSERT OR IGNORE INTO unified_search (
    ITEM_SEQ, 
    EE_DOC_DATA, 
    UD_DOC_DATA, 
    NB_DOC_DATA
  ) VALUES `;

  const queryValues = Object.values(unifiedSearchData)
    .map((v) => (typeof v === "string" ? `'${v?.replace(/'/g, "''")}'` : v))
    .join(",");

  insertQuery += `(${queryValues});`;

  createSQLFile("unified_search.sql", insertQuery);
  runQueryForSQLFile("unified_search.sql");
}

/**
 * INSERT에 실패한 데이터를 JSON 파일로 생성
 * @param unifiedSearchData INSERT에 실패한 데이터
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
async function insertAll(pillDataIDs: string[]) {
  for await (const itemSeq of pillDataIDs) {
    const docData = await getDocData(itemSeq);

    const insertData = { ITEM_SEQ: itemSeq, ...docData };

    try {
      await insert(insertData);
    } catch (e) {
      logger.error(
        "[UNIFIED-SEARCH] Failed to insert data. error: %s",
        e.stack || e,
      );

      await writeFailedData(insertData);
    }
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

    dropTable();
    createTable();
    await insertAll(pillDataIDs);

    logger.info("[UNIFIED-SEARCH] Complete create pill data resource file");
  } catch (e) {
    logger.error(
      "[UNIFIED-SEARCH] Failed to create pill data resource file. %s",
      e.stack || e,
    );
  }
}
