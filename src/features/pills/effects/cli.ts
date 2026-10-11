import { retryFailedPillEffectSummaries } from "./maintenance";

/** 실패 요약 재조회 명령을 실행한다. */
async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (command === "retry" && (args.length === 0 || (args.length === 2 && args[0] === "--limit"))) {
    const limit = args.length ? Number(args[1]) : undefined;
    console.log(JSON.stringify(await retryFailedPillEffectSummaries({ limit }), null, 2));
    return;
  }

  throw new Error("Usage: cli.ts retry [--limit <positive integer>]");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
