import logger from "../../utils/logger";
import {
  createUnifiedSearchTable,
  createUnifiedSearchFtsTable,
  createUnifiedSearchFtsInsertTrigger,
  createUnifiedSearchFtsUpdateTrigger,
  createUnifiedSearchFtsDeleteTrigger,
} from "./schema";

/**
 * 통합 검색 테이블, FTS5 가상 테이블 및 동기화 트리거 생성
 */
export async function createTables() {
  logger.info("[UNIFIED-SEARCH-TABLES] Start creating tables and triggers");

  // 검색 원본 테이블과 FTS5 가상 테이블을 준비
  createUnifiedSearchTable();
  createUnifiedSearchFtsTable();

  // 이후 데이터 추가·변경·삭제가 FTS 인덱스에 반영되도록 트리거를 등록
  createUnifiedSearchFtsInsertTrigger();
  createUnifiedSearchFtsUpdateTrigger();
  createUnifiedSearchFtsDeleteTrigger();

  // 테이블 및 트리거 준비가 완료됐음을 기록
  logger.info(
    "[UNIFIED-SEARCH-TABLES] Successfully created tables and triggers",
  );
}
