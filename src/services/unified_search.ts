import axios from "axios";
import {
  logger,
  mergeDuplicateObjectArray,
  ResourceLoader,
  runQuery,
  normalizeText,
  createSQLFile,
  runQueryForSQLFile,
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
  CREATE TABLE unified_search (
    ITEM_SEQ TEXT PRIMARY KEY,
    EE_DOC_DATA TEXT,
    UD_DOC_DATA TEXT,
    NB_DOC_DATA TEXT
  )`;
  runQuery(createTableQuery);

  const createFTS5Query = `
  CREATE VIRTUAL TABLE unified_search_fts
  USING fts5(
    EE_DOC_DATA,
    UD_DOC_DATA,
    NB_DOC_DATA,
    content='unified_search',
    content_rowid='rowid'
  )`;
  runQuery(createFTS5Query);
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
    logger.info("Failed to get doc data. item_seq: %s. %s", e.stack || e);

    return { EE_DOC_DATA: "", UD_DOC_DATA: "", NB_DOC_DATA: "" };
  }
}

/**
 * D1 DB에 insert 수행
 * @param unifiedSearchData 통합 검색 데이터
 * @returns
 */
async function insert(unifiedSearchData: IUnifiedSearchData) {
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

  insertQuery += `(${queryValues})`;

  createSQLFile("unified_search.sql", insertQuery);
  runQueryForSQLFile("unified_search.sql");
}

/**
 * 통합 검색 DB 업데이트
 * @param resource 리소스 데이터
 */
async function insertAll(pillDataIDs: string[]) {
  for await (const itemSeq of pillDataIDs) {
    const docData = await getDocData(itemSeq);

    insert({ ITEM_SEQ: itemSeq, ...docData });
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
