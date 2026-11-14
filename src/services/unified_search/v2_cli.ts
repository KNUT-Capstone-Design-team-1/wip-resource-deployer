import { createSqlFile } from "./database/sql_file";
import {
  runQuery,
  runQueryForSqlFile,
  runQueryWithOutput,
} from "./database/wrangler";
import { TARGET_DB } from "./repository";
import { SCHEMA_V2 } from "./v2";
import { readPillDataResource } from "./pill_resource";
import { upsertAll } from "./batches";
import { upsertFailedRetryAll } from "../unified_search_insert_failed";

async function verify() {
  const pills = await readPillDataResource();
  const expected = new Set(pills.map((pill) => pill.ITEM_SEQ));
  const output = runQueryWithOutput(
    `SELECT ITEM_SEQ,
    (INDICATION_TEXT IS NULL OR USAGE_TEXT IS NULL OR WARNING_TEXT IS NULL) AS incomplete
    FROM unified_search_v2`,
    TARGET_DB,
    true,
  );
  const responses = JSON.parse(output);
  if (
    !Array.isArray(responses) ||
    responses.length !== 1 ||
    responses[0].success !== true ||
    !Array.isArray(responses[0].results)
  )
    throw new Error("Unexpected D1 verification response");
  const rows = responses[0].results as {
    ITEM_SEQ: string;
    incomplete: number;
  }[];
  const found = new Set(rows.map((row) => row.ITEM_SEQ));
  const missing = [...expected].filter((id) => !found.has(id));
  const extra = [...found].filter((id) => !expected.has(id));
  const incomplete = rows.filter((row) => row.incomplete !== 0);
  if (missing.length || extra.length || incomplete.length) {
    throw new Error(
      `V2 not ready: missing=${missing.length}, extra=${extra.length}, ` +
        `incomplete=${incomplete.length}; examples=${JSON.stringify({
          missing: missing.slice(0, 20),
          extra: extra.slice(0, 20),
          incomplete: incomplete.slice(0, 20).map((row) => row.ITEM_SEQ),
        })}`,
    );
  }
  for (const table of ["unified_search_fts_v2", "unified_search_docs_fts_v2"]) {
    runQuery(
      `INSERT INTO ${table}(${table}, rank) VALUES ('integrity-check', 1)`,
      TARGET_DB,
    );
  }
  console.log(`V2 source and both FTS indexes verified: ${rows.length} items.`);
}

async function main() {
  const mode = process.argv[2];
  if (
    process.argv.length !== 3 ||
    !["schema", "backfill", "retry", "verify"].includes(mode)
  ) {
    throw new Error(
      "Usage: ts-node src/services/unified_search/v2_cli.ts schema|backfill|retry|verify (REMOTE D1)",
    );
  }
  if (mode === "schema") {
    // One-time additive schema only. Never run migrations in the request path.
    createSqlFile("unified_search_v2_schema.sql", SCHEMA_V2);
    runQueryForSqlFile("unified_search_v2_schema.sql", TARGET_DB);
  } else if (mode === "backfill") {
    await upsertAll(await readPillDataResource());
    await verify();
  } else if (mode === "retry") {
    await upsertFailedRetryAll();
    await verify();
  } else {
    await verify();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
