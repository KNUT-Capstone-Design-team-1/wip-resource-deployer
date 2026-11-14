import { normalizeText } from "./contents";
import { randomUUID } from "node:crypto";
import { getSafeValue } from "./database/sql_values";
import type { IUnifiedSearchData, SearchPill } from "./types/unified_search";

// Keep this order aligned with the Worker's bm25 weights.
export const CORE_COLUMNS = [
  "NAME_TEXT",
  "INGREDIENT_TEXT",
  "INDICATION_TEXT",
  "APPEARANCE_TEXT",
  "COMPANY_TEXT",
] as const;
export const DOCUMENT_COLUMNS = ["USAGE_TEXT", "WARNING_TEXT"] as const;
export const ALL_COLUMNS = [...CORE_COLUMNS, ...DOCUMENT_COLUMNS];

// D1 limits each SQL statement to 100,000 UTF-8 bytes, even inside an SQL file.
export const MAX_SQL_STATEMENT_BYTES = 90_000;
const CHUNK_LITERAL_BYTES = 60_000;
const MAX_ROW_BYTES = 1_990_000; // Leave room below D1's 2 MB row limit.
const IMPORT_TABLE = "unified_search_import_chunks_v2";
const IMPORT_SCHEMA = `CREATE TABLE IF NOT EXISTS ${IMPORT_TABLE} (
  IMPORT_KEY TEXT NOT NULL, FIELD_NAME TEXT NOT NULL, PART_INDEX INTEGER NOT NULL,
  CONTENT TEXT NOT NULL, PRIMARY KEY (IMPORT_KEY, FIELD_NAME, PART_INDEX)
);`;

export const FTS_TABLES = [
  "unified_search_fts_v2",
  "unified_search_docs_fts_v2",
] as const;
export const FTS_SCHEMA =
  ftsSchema(FTS_TABLES[0], CORE_COLUMNS) +
  "\n" +
  ftsSchema(FTS_TABLES[1], DOCUMENT_COLUMNS);

export const SEARCH_SCHEMA = `
CREATE TABLE IF NOT EXISTS unified_search_v2 (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  ITEM_SEQ TEXT NOT NULL UNIQUE,
  NAME_TEXT TEXT NOT NULL, INGREDIENT_TEXT TEXT NOT NULL,
  INDICATION_TEXT TEXT, APPEARANCE_TEXT TEXT NOT NULL, COMPANY_TEXT TEXT NOT NULL,
  USAGE_TEXT TEXT, WARNING_TEXT TEXT
);
${FTS_SCHEMA}
`;

function ftsSchema(table: string, columns: readonly string[]) {
  const names = columns.join(", ");
  const oldValues = columns.map((c) => `old.${c}`).join(", ");
  const newValues = columns.map((c) => `new.${c}`).join(", ");
  return `
CREATE VIRTUAL TABLE IF NOT EXISTS ${table} USING fts5(
  ${names}, content='unified_search_v2', content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 0'
);
CREATE TRIGGER IF NOT EXISTS ${table}_ai AFTER INSERT ON unified_search_v2 BEGIN
  INSERT INTO ${table}(rowid, ${names}) VALUES (new.rowid, ${newValues});
END;
CREATE TRIGGER IF NOT EXISTS ${table}_ad AFTER DELETE ON unified_search_v2 BEGIN
  INSERT INTO ${table}(${table}, rowid, ${names}) VALUES ('delete', old.rowid, ${oldValues});
END;
CREATE TRIGGER IF NOT EXISTS ${table}_au AFTER UPDATE ON unified_search_v2 BEGIN
  INSERT INTO ${table}(${table}, rowid, ${names}) VALUES ('delete', old.rowid, ${oldValues});
  INSERT INTO ${table}(rowid, ${names}) VALUES (new.rowid, ${newValues});
END;`;
}

export function buildMetadata(pill: SearchPill) {
  const text = (...values: string[]) => normalizeText(values.join(" "));
  return {
    NAME_TEXT: text(pill.ITEM_NAME),
    INGREDIENT_TEXT: text(pill.MATERIAL_NAME, pill.MATERIAL_ENG_NAME),
    APPEARANCE_TEXT: text(
      pill.CHART,
      pill.PRINT_FRONT,
      pill.PRINT_BACK,
      pill.DRUG_SHAPE,
      pill.COLOR_CLASS1,
      pill.COLOR_CLASS2,
    ),
    COMPANY_TEXT: text(pill.ENTP_NAME, pill.ENTP_ENG_NAME),
  };
}

export function hasSearchFields(record: IUnifiedSearchData): boolean {
  return ALL_COLUMNS.every(
    (column) =>
      typeof record[column] === "string" ||
      (["INDICATION_TEXT", "USAGE_TEXT", "WARNING_TEXT"].includes(column) &&
        record[column] === null),
  );
}

export function hasMissingDocuments(record: IUnifiedSearchData): boolean {
  return (
    !hasSearchFields(record) ||
    [record.INDICATION_TEXT, record.USAGE_TEXT, record.WARNING_TEXT].some(
      (value) => value === null,
    )
  );
}

function splitLiteral(value: string): string[] {
  const chunks: string[] = [];
  let parts: string[] = [];
  let bytes = 0;
  // Iterate code points so UTF-8 characters/surrogate pairs are never split.
  for (const char of value) {
    const size = Buffer.byteLength(char, "utf8") + (char === "'" ? 1 : 0);
    if (bytes + size > CHUNK_LITERAL_BYTES) {
      chunks.push(parts.join(""));
      parts = [];
      bytes = 0;
    }
    parts.push(char);
    bytes += size;
  }
  chunks.push(parts.join(""));
  return chunks;
}

function recordStatements(
  record: IUnifiedSearchData,
  values: (column: keyof IUnifiedSearchData) => string,
): string[] {
  const columns = ["ITEM_SEQ", ...ALL_COLUMNS] as const;
  // NULL means fetch failure; an empty string is a successful, empty document.
  const updates = ALL_COLUMNS.map(
    (c) => `${c} = COALESCE(excluded.${c}, unified_search_v2.${c})`,
  );
  const statements = [
    `INSERT INTO unified_search_v2 (${columns.join(", ")}) VALUES (${columns.map(values).join(", ")})
    ON CONFLICT(ITEM_SEQ) DO UPDATE SET ${updates.join(", ")};`,
  ];
  return statements;
}

export function buildUpsertStatements(records: IUnifiedSearchData[]): string[] {
  if (records.some((record) => !hasSearchFields(record))) {
    throw new Error(
      "Invalid search record: regenerate with createSearchRecord before retrying",
    );
  }
  const statements: string[] = [];
  let importTableCreated = false;
  for (const record of records) {
    const rowBytes =
      Buffer.byteLength(record.ITEM_SEQ, "utf8") +
      ALL_COLUMNS.reduce(
        (bytes, column) =>
          bytes + Buffer.byteLength(record[column] ?? "", "utf8"),
        0,
      );
    if (rowBytes > MAX_ROW_BYTES) {
      throw new Error(
        `ITEM_SEQ=${record.ITEM_SEQ}: rowBytes=${rowBytes}; ` +
          `exceeds safe row limit ${MAX_ROW_BYTES} bytes (D1 maximum 2 MB). Original text was not truncated.`,
      );
    }
    const direct = recordStatements(record, (column) =>
      getSafeValue(record[column]),
    );
    if (
      direct.every(
        (sql) => Buffer.byteLength(sql, "utf8") <= MAX_SQL_STATEMENT_BYTES,
      )
    ) {
      statements.push(...direct);
      continue;
    }
    // Stage oversized literals, then publish the complete row in one UPSERT.
    // The active source/FTS never sees a partially assembled document.
    if (!importTableCreated) {
      statements.push(IMPORT_SCHEMA);
      importTableCreated = true;
    }
    const importKey = getSafeValue(randomUUID());
    const expressions = new Map<keyof IUnifiedSearchData, string>();
    for (const column of ALL_COLUMNS) {
      const value = record[column];
      if (value == null) continue;
      splitLiteral(value).forEach((chunk, index) => {
        statements.push(`INSERT INTO ${IMPORT_TABLE} (IMPORT_KEY, FIELD_NAME, PART_INDEX, CONTENT)
          VALUES (${importKey}, ${getSafeValue(column)}, ${index}, ${getSafeValue(chunk)});`);
      });
      expressions.set(
        column,
        `(SELECT group_concat(CONTENT, '') FROM
        (SELECT CONTENT FROM ${IMPORT_TABLE} WHERE IMPORT_KEY = ${importKey}
          AND FIELD_NAME = ${getSafeValue(column)} ORDER BY PART_INDEX))`,
      );
    }
    statements.push(
      ...recordStatements(
        record,
        (column) => expressions.get(column) ?? getSafeValue(record[column]),
      ),
    );
    statements.push(
      `DELETE FROM ${IMPORT_TABLE} WHERE IMPORT_KEY = ${importKey};`,
    );
  }
  if (
    statements.some(
      (sql) => Buffer.byteLength(sql, "utf8") > MAX_SQL_STATEMENT_BYTES,
    )
  ) {
    throw new Error(
      "Search SQL statement exceeds the D1 byte limit; no SQL was sent",
    );
  }
  return statements;
}

export function buildUpsertSql(records: IUnifiedSearchData[]): string {
  return buildUpsertStatements(records).join("\n");
}
