import { logger, runQuery } from "../utils";

const TARGET_DB = "wip_unified_search";

/**
 * 메인 통합 검색 테이블 생성
 */
export function createUnifiedSearchTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS unified_search (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      ITEM_SEQ TEXT UNIQUE,
      CONTENTS TEXT
    )`;
  runQuery(createTableQuery, TARGET_DB);
}

/**
 * FTS5 가상 테이블 생성
 */
export function createUnifiedSearchFTSTable() {
  const createFTS5Query = `
    CREATE VIRTUAL TABLE IF NOT EXISTS unified_search_fts
    USING fts5 (
      CONTENTS,
      content='unified_search',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 0'
    )`;
  runQuery(createFTS5Query, TARGET_DB);
}

/**
 * INSERT Trigger 생성
 */
export function createUnifiedSearchFTSInsertTrigger() {
  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS unified_search_ai
    AFTER INSERT ON unified_search
    BEGIN
      INSERT INTO unified_search_fts(rowid, CONTENTS)
      VALUES (NEW.rowid, NEW.CONTENTS);
    END`;
  runQuery(createTriggerQuery, TARGET_DB);
}

/**
 * UPDATE Trigger 생성 (OLD rowid delete & NEW rowid insert)
 */
export function createUnifiedSearchFTSUpdateTrigger() {
  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS unified_search_au
    AFTER UPDATE ON unified_search
    BEGIN
      INSERT INTO unified_search_fts(unified_search_fts, rowid, CONTENTS)
      VALUES ('delete', OLD.rowid, OLD.CONTENTS);
      INSERT INTO unified_search_fts(rowid, CONTENTS)
      VALUES (NEW.rowid, NEW.CONTENTS);
    END`;
  runQuery(createTriggerQuery, TARGET_DB);
}

/**
 * DELETE Trigger 생성 (OLD rowid delete)
 */
export function createUnifiedSearchFTSDeleteTrigger() {
  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS unified_search_ad
    AFTER DELETE ON unified_search
    BEGIN
      INSERT INTO unified_search_fts(unified_search_fts, rowid, CONTENTS)
      VALUES ('delete', OLD.rowid, OLD.CONTENTS);
    END`;
  runQuery(createTriggerQuery, TARGET_DB);
}

/**
 * 통합 검색 테이블, FTS5 가상 테이블 및 동기화 트리거 생성
 */
export async function createTables() {
  logger.info("[UNIFIED-SEARCH-TABLES] Start creating tables and triggers");

  try {
    createUnifiedSearchTable();
    createUnifiedSearchFTSTable();
    createUnifiedSearchFTSInsertTrigger();
    createUnifiedSearchFTSUpdateTrigger();
    createUnifiedSearchFTSDeleteTrigger();

    logger.info(
      "[UNIFIED-SEARCH-TABLES] Successfully created tables and triggers",
    );
  } catch (e: any) {
    logger.error(
      "[UNIFIED-SEARCH-TABLES] Failed to create tables and triggers. %s",
      e.stack || e,
    );
  }
}
