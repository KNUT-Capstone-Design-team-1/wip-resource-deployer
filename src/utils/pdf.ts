import fs from "fs";
import axios from "axios";

/**
 * PDF 파일로 부터 텍스트 추출
 * @param filePath 파일 경로
 * @returns
 */
export async function extractText(filePath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath));

  // TS가 require()로 변환하는 것을 방지하기 위해 eval 사용
  const pdfjsLib = await eval('import("pdfjs-dist/legacy/build/pdf.mjs")');

  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

/**
 * OLLAMA를 통해 LLM을 실행하여 PDF 파일로 부터 내용 추출
 * @param prompt 프롬프트
 * @returns
 */
export async function classifyWithLLM(prompt: string) {
  const res = await axios.post("http://localhost:11434/api/generate", {
    model: "gemma",
    prompt,
    stream: false,
  });

  const text = res.data.response;

  return JSON.parse(text);
}

export interface IPDFProcessorConfig<T> {
  sectionRegex?: RegExp;
  promptGenerator: (content: string, category?: string) => string;
  postProcessor?: (items: any[], category?: string) => T[];
}

/**
 * PDF 파일을 읽고 LLM을 통해 구조화된 데이터로 변환
 * @param filePath 파일 경로
 * @param config 프로세서 설정
 * @returns
 */
export async function processPDFWithLLM<T>(
  filePath: string,
  config: IPDFProcessorConfig<T>,
): Promise<T[]> {
  const text = await extractText(filePath);
  const results: T[] = [];

  if (config.sectionRegex) {
    const matches = [...text.matchAll(config.sectionRegex)];

    for (let i = 0; i < matches.length; i++) {
      const category = matches[i][0];
      const start = matches[i].index!;
      const end = matches[i + 1]?.index ?? text.length;
      const content = text.slice(start, end);

      const prompt = config.promptGenerator(content, category);
      const items = (await classifyWithLLM(prompt)) as any[];

      if (config.postProcessor) {
        results.push(...config.postProcessor(items, category));
      } else {
        results.push(...items);
      }
    }
  } else {
    const prompt = config.promptGenerator(text);
    const items = (await classifyWithLLM(prompt)) as any[];

    if (config.postProcessor) {
      results.push(...config.postProcessor(items));
    } else {
      results.push(...items);
    }
  }

  return results;
}
