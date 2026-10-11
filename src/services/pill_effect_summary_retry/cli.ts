import { retryFailedPillEffectSummaries } from "./index";

/**
 * 실패 요약 재조회 명령을 실행한다.
 */
async function main() {
  // 실행 명령과 처리 건수 제한 옵션을 읽는다.
  const [command, ...args] = process.argv.slice(2);

  // 허용된 명령과 옵션 형식이면 실패 요약 재조회를 실행한다.
  if (command === "retry" && (args.length === 0 || (args.length === 2 && args[0] === "--limit"))) {
    const limit = args.length ? Number(args[1]) : undefined;

    console.log(JSON.stringify(await retryFailedPillEffectSummaries({ limit }), null, 2));

    return;
  }

  // 지원하지 않는 명령에는 올바른 사용법을 안내한다.
  throw new Error("Usage: cli.ts retry [--limit <positive integer>]");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
