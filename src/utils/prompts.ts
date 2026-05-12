/**
 * PDF 리소스 추출용 프롬프트 모음
 */
export const PROMPTS = {
  prohibited_list: `
You are a medical substance extraction expert specialized in the WADA Prohibited List.
Extract all prohibited substances from the provided text, which is from the 2026 Prohibited List International Standard.

CRITICAL RULES:
1. Extract the substance English names (genericEn).
2. For EACH substance, identify its category code (e.g., S1, S2, S6, P1, M1). If a specific category code is mentioned in the text context (like "S1. ANABOLIC AGENTS"), use it.
3. For EACH substance, determine if it is prohibited "In-Competition" and "Out-of-Competition".
   - Look for headers like "PROHIBITED AT ALL TIMES (IN- AND OUT-OF-COMPETITION)" or "PROHIBITED IN-COMPETITION".
   - inGameProhibited: 1 if prohibited In-Competition, 0 otherwise.
   - outGameProhibited: 1 if prohibited Out-of-Competition, 0 otherwise.
4. Extract ONLY English names.
5. Deduplicate.

Output STRICT JSON ARRAY of objects:
[
  { 
    "genericEn": "Substance Name",
    "category": "S1",
    "inGameProhibited": 1,
    "outGameProhibited": 1
  },
  ...
]

Text:
{{content}}
`,
} as const;
