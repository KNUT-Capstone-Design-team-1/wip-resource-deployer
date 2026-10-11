import type { IStatsResult } from "./types/unified_search";
import logger from "../../utils/logger";
import { runQuery, runQueryWithOutput } from "./database/wrangler";
import {
  createUnifiedSearchFTSTable,
  createUnifiedSearchFTSInsertTrigger,
  createUnifiedSearchFTSUpdateTrigger,
  createUnifiedSearchFTSDeleteTrigger,
} from "../unified_search_create_tables/schema";
import { TARGET_DB } from "./repository";

const CHUNK_SIZE = 1000;

/**
 * 통계 조회 결과가 없거나 파싱에 실패했을 때 사용할 기본값.
 */
const EMPTY_STATS: IStatsResult = { minRowId: 1, maxRowId: 0, totalCount: 0 };

/**
 * D1 응답의 첫 결과 행에서 rowid 범위와 전체 건수를 읽는다.
 */
function parseStatsRow(parsed: any) {
  const hasResults = Array.isArray(parsed) && Boolean(parsed[0]?.results?.[0]);

  if (!hasResults) {
    return EMPTY_STATS;
  }

  const row = parsed[0].results[0];

  return {
    minRowId: Number(row.min_id) || 1,
    maxRowId: Number(row.max_id) || 0,
    totalCount: Number(row.total_count) || 0,
  };
}

/**
 * Wrangler 출력에서 JSON 통계를 추출하고 파싱 실패 시 빈 통계를 반환한다.
 */
function parseStatsOutput(output: string) {
  const jsonMatch = output.match(/\[\s*\{[\s\S]*\}\s*\]/);
  const hasJson = jsonMatch !== null;

  if (!hasJson) {
    return EMPTY_STATS;
  }

  try {
    return parseStatsRow(JSON.parse(jsonMatch[0]));
  }
  catch (e) {
    logger.warn("[UNIFIED-SEARCH-FTS-REBUILD] Failed to parse JSON stats");

    return EMPTY_STATS;
  }
}

/**
 * 기존 unified_search 데이터를 보존한 채 FTS5 인덱스를 청크 단위로 안전하게 재구축(Rebuild)
 */
export async function rebuildFTS5() {
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Start chunked FTS5 rebuild");

  // 1. 기존 FTS 테이블 및 동기화 트리거 삭제
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Dropping old FTS table and triggers");

  const dropQuery = `
      DROP TRIGGER IF EXISTS unified_search_ai;
      DROP TRIGGER IF EXISTS unified_search_au;
      DROP TRIGGER IF EXISTS unified_search_ad;
      DROP TABLE IF EXISTS unified_search_fts;
    `;

  runQuery(dropQuery, TARGET_DB);

  // 2. 신규 FTS5 가상 테이블 생성 (트리거는 데이터 적재 후 생성)
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Creating fresh FTS5 virtual table");
  createUnifiedSearchFTSTable();

  // 3. unified_search 테이블의 min/max rowid 및 총 row 수 확인 (stdout 캡처)
  const statsOutput = runQueryWithOutput(`SELECT MIN(rowid) AS min_id, MAX(rowid) AS max_id, COUNT(*) AS total_count FROM unified_search;`, TARGET_DB);
  const { minRowId, maxRowId, totalCount } = parseStatsOutput(statsOutput);

  logger.info(`[UNIFIED-SEARCH-FTS-REBUILD] Target data: ${totalCount} rows (rowid: ${minRowId} ~ ${maxRowId})`);

  // 원본 rowid 범위의 데이터를 청크 단위로 인덱스에 적재
  populateFTS(minRowId, maxRowId);

  // 4. 트리거 등록 (이후 INSERT/UPDATE/DELETE 실시간 동기화)
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Creating sync triggers (INSERT, UPDATE, DELETE)");
  createUnifiedSearchFTSInsertTrigger();
  createUnifiedSearchFTSUpdateTrigger();
  createUnifiedSearchFTSDeleteTrigger();
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Complete chunked FTS5 rebuild successfully");
}

/**
 * 지정한 rowid 범위를 청크 단위로 나누어 FTS5 인덱스에 적재한다.
 */
function populateFTS(minRowId: number, maxRowId: number) {
  for (let startId = minRowId; startId <= maxRowId; startId += CHUNK_SIZE) {
    const endId = startId + CHUNK_SIZE - 1;

    logger.info(`[UNIFIED-SEARCH-FTS-REBUILD] Populating FTS chunk: rowid ${startId} ~ ${endId}`);

    const chunkQuery = `
          INSERT INTO unified_search_fts(rowid, CONTENTS)
          SELECT rowid, CONTENTS FROM unified_search
          WHERE rowid BETWEEN ${startId} AND ${endId};
        `;

    runQuery(chunkQuery, TARGET_DB);
  }
}
