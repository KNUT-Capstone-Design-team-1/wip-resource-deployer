import { logger, runQuery, runQueryWithOutput } from "../utils";
import {
  createUnifiedSearchFTSTable,
  createUnifiedSearchFTSInsertTrigger,
  createUnifiedSearchFTSUpdateTrigger,
  createUnifiedSearchFTSDeleteTrigger,
} from "./unified_search_create_tables";

const TARGET_DB = "wip_unified_search";
const CHUNK_SIZE = 1000;

interface IStatsResult {
  minRowId: number;
  maxRowId: number;
  totalCount: number;
}

/**
 * Cloudflare D1 쿼리 결과에서 통계 정보(min, max, count) 파싱
 * @param output stdout 출력 문자열
 */
function parseStatsOutput(output: string): IStatsResult {
  try {
    const jsonMatch = output.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
        const row = parsed[0].results[0];
        return {
          minRowId: Number(row.min_id) || 1,
          maxRowId: Number(row.max_id) || 0,
          totalCount: Number(row.total_count) || 0,
        };
      }
    }
  } catch (e) {
    logger.warn("[UNIFIED-SEARCH-FTS-REBUILD] Failed to parse JSON stats, trying regex fallback");
  }

  return { minRowId: 1, maxRowId: 0, totalCount: 0 };
}

/**
 * 기존 unified_search 데이터를 보존한 채 FTS5 인덱스를 청크 단위로 안전하게 재구축(Rebuild)
 */
export async function rebuildFTS5() {
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Start chunked FTS5 rebuild");

  try {
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
    const statsOutput = runQueryWithOutput(
      `SELECT MIN(rowid) AS min_id, MAX(rowid) AS max_id, COUNT(*) AS total_count FROM unified_search;`,
      TARGET_DB,
    );

    const { minRowId, maxRowId, totalCount } = parseStatsOutput(statsOutput);

    logger.info(
      `[UNIFIED-SEARCH-FTS-REBUILD] Target data: ${totalCount} rows (rowid: ${minRowId} ~ ${maxRowId})`,
    );

    if (maxRowId > 0) {
      // 4. 청크 단위로 FTS5에 데이터 적재
      for (let startId = minRowId; startId <= maxRowId; startId += CHUNK_SIZE) {
        const endId = startId + CHUNK_SIZE - 1;
        logger.info(
          `[UNIFIED-SEARCH-FTS-REBUILD] Populating FTS chunk: rowid ${startId} ~ ${endId}`,
        );

        const chunkQuery = `
          INSERT INTO unified_search_fts(rowid, CONTENTS)
          SELECT rowid, CONTENTS FROM unified_search
          WHERE rowid BETWEEN ${startId} AND ${endId};
        `;
        runQuery(chunkQuery, TARGET_DB);
      }
    }

    // 5. 트리거 등록 (이후 INSERT/UPDATE/DELETE 실시간 동기화)
    logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Creating sync triggers (INSERT, UPDATE, DELETE)");
    createUnifiedSearchFTSInsertTrigger();
    createUnifiedSearchFTSUpdateTrigger();
    createUnifiedSearchFTSDeleteTrigger();

    logger.info(
      "[UNIFIED-SEARCH-FTS-REBUILD] Complete chunked FTS5 rebuild successfully",
    );
  } catch (e: any) {
    logger.error(
      "[UNIFIED-SEARCH-FTS-REBUILD] Failed to rebuild FTS5. %s",
      e.stack || e,
    );
  }
}
