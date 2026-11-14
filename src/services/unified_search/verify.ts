import { runQuery, runQueryWithOutput } from "./database/wrangler";
import { TARGET_DB } from "./repository";
import { readPillDataResource } from "./pill_resource";
import { FTS_TABLES } from "./search_data";

export async function verifyUnifiedSearch() {
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
      `Search not ready: missing=${missing.length}, extra=${extra.length}, ` +
        `incomplete=${incomplete.length}; examples=${JSON.stringify({
          missing: missing.slice(0, 20),
          extra: extra.slice(0, 20),
          incomplete: incomplete.slice(0, 20).map((row) => row.ITEM_SEQ),
        })}`,
    );
  }
  for (const table of FTS_TABLES) {
    runQuery(
      `INSERT INTO ${table}(${table}, rank) VALUES ('integrity-check', 1)`,
      TARGET_DB,
    );
  }
  console.log(
    `Search source and both FTS indexes verified: ${rows.length} items.`,
  );
}
