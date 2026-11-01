import { runQuery } from "../unified_search/database/wrangler";
import { TARGET_DB } from "../unified_search/repository";

/**
 * 검색 테이블 생성
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
 * FTS5 테이블 생성
 */
export function createUnifiedSearchFtsTable() {
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
 * FTS5 삽입 트리거 생성
 */
export function createUnifiedSearchFtsInsertTrigger() {
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
 * FTS5 갱신 트리거 생성
 */
export function createUnifiedSearchFtsUpdateTrigger() {
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
 * FTS5 삭제 트리거 생성
 */
export function createUnifiedSearchFtsDeleteTrigger() {
  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS unified_search_ad
    AFTER DELETE ON unified_search
    BEGIN
      INSERT INTO unified_search_fts(unified_search_fts, rowid, CONTENTS)
      VALUES ('delete', OLD.rowid, OLD.CONTENTS);
    END`;

  runQuery(createTriggerQuery, TARGET_DB);
}
