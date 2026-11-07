import { normalizeWhitespace } from "./text";
import { simplifyEffectTerminology } from "./terminology";

/**
 * HTML 엔티티 복원
 */
function decodeHtmlEntities(text: string) {
  const namedEntities: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };

  let decoded = text;

  // &amp;nbsp;처럼 중첩 인코딩된 엔티티도 제한된 횟수 안에서 해석한다.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const previous = decoded;
    decoded = decoded
      .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => {
        return namedEntities[name.toLowerCase()] ?? match;
      })
      .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
        const codePoint = Number.parseInt(hex, 16);

        return Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      })
      .replace(/&#(\d+);/g, (match, decimal: string) => {
        const codePoint = Number.parseInt(decimal, 10);

        return Number.isNaN(codePoint)
          ? match
          : String.fromCodePoint(codePoint);
      });

    if (decoded === previous) {
      break;
    }
  }

  return decoded;
}

/** 원문 보존 경로와 분리해 요약에서만 진단 전용 절과 환산표를 제외한다. */
function removeNonEffectMarkup(raw: string | null | undefined) {
  if (typeof raw !== "string") return raw;
  return (
    raw
      // 진단·교육 전용 절과 키/체중 환산표는 적응증 본문이 아니다.
      .replace(
        /<ARTICLE\b[^>]*\btitle=["'](?:진단시\s*특별히|세심한\s*치료\s*프로그램)[^"']*["'][^>]*?(?:\/\s*>|>[\s\S]*?<\/ARTICLE>)/gi,
        "\n",
      )
      .replace(
        /<PARAGRAPH\b[^>]*>([\s\S]*?)<\/PARAGRAPH>/gi,
        (paragraph, body: string) => {
          const diagnostic =
            /진단하는 것은|있음을 뜻한다|최소\s*\d+가지가\s*최소|기준이 만족되어야/.test(
              body,
            );
          const bmiTable =
            /tagName=["']table["']/i.test(paragraph) &&
            /체중/.test(body) &&
            /키\s*\(?cm/.test(body);
          return diagnostic || bmiTable ? "\n" : paragraph;
        },
      )
  );
}

/**
 * 태그·문서 장식 제거
 */
export function cleanHtml(raw: string | null | undefined) {
  const isEmptyInput = typeof raw !== "string" || !raw.trim();

  if (isEmptyInput) {
    return "";
  }

  let text = raw
    // 효능 XML은 본문 없이 ARTICLE/SECTION의 title 속성에 내용을 담기도 한다.
    .replace(/<(?:article|section)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
      const title = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);

      return title ? `\n${title[1] ?? title[2]}\n` : "\n";
    })
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<sup>\s*2\s*<\/sup>/gi, "²")
    .replace(
      /<(?:br|\/p|\/paragraph|\/div|\/li|\/section|\/article)[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text)
    .replace(/<\/?(?:sub|sup|b|strong|em|span)\b[^>]*>/gi, "")
    // PDF/웹 변환 과정에서 들어오는 특수 bullet을 줄바꿈으로 취급한다.
    .replace(/[•◦▪▫●○◎◇◆□■▶▷]/g, "\n")
    .replace(/\r\n?/g, "\n");

  return text
    .replace(/급\s*[.·ㆍ]\s*만성/g, "급·만성")
    .replace(/뼈\s*[,.]\s*이의/g, "뼈·이의")
    .replace(/([ABC]형)\s*,\s*(?=니만[-\s]*피크)/g, "$1 ")
    .replace(/위\s*,\s*십이지장/g, "위·십이지장")
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * 효능 외 항목 확인
 */
function isNonEffectLine(line: string) {
  const isEmptyLine = !line;

  if (isEmptyLine) {
    return true;
  }

  const sectionHeadingPatterns = [
    /^용법(?:\s*·?\s*용량)?/,
    /^용량/,
    /^투여방법/,
    /^복용방법/,
    /^사용방법/,
    /^사용법/,
    /^주의사항/,
    /^주의(?:\s|[:：]|$)/,
    /^금기/,
    /^경고/,
    /^신중투여/,
    /^이상반응/,
    /^부작용/,
    /^상호작용/,
    /^임상시험/,
    /^보관방법/,
    /^저장방법/,
    /^취급상주의/,
    /^첨가제/,
    /^성상/,
    /^포장단위/,
    /^보험/,
    /^표\s*\d+[.：:]?\s*체질량지수/,
  ];

  const isSectionHeading = sectionHeadingPatterns.some((pattern) =>
    pattern.test(line),
  );

  if (isSectionHeading) {
    return true;
  }

  return [
    "환자에게만 투여",
    "환자에게 투여",
    "의사 또는 약사의 지시에 따라",
    "전문의의 처방",
  ].some((keyword) => line.includes(keyword));
}

/**
 * 효능 외 항목 제거
 */
function removeNonEffectLines(text: string) {
  let isOrganismSection = false;

  return text
    .split("\n")
    .map(normalizeWhitespace)
    .filter((line) => {
      const heading = line.replace(/^\d+[.)]\s*/, "");

      if (/^유효균종/.test(line)) {
        isOrganismSection = true;

        return false;
      }

      if (/^적응증(?:\s*[:：]|$)/.test(heading)) {
        isOrganismSection = false;

        return !/^적응증\s*[:：]?$/.test(heading);
      }

      return Boolean(line) && !isOrganismSection && !isNonEffectLine(line);
    })
    .join("\n");
}

/** 요약 가능한 효능 본문만 정제한다. */
export function readEffectDocumentText(document: string | null | undefined) {
  return removeNonEffectLines(
    simplifyEffectTerminology(cleanHtml(removeNonEffectMarkup(document))),
  );
}
