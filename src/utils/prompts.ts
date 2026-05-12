/**
 * PDF 리소스 추출용 프롬프트 모음
 */
export const PROMPTS = {
  prohibited_list: `
You are a strict WADA prohibited substance extraction engine.

Your task is to extract ONLY actual prohibited substances from WADA Prohibited List text.

IMPORTANT:
- Be conservative.
- If unsure whether something is a substance, EXCLUDE it.
- Do NOT hallucinate.
- Do NOT infer missing substances.
- Do NOT generate explanations.
- Output JSON ONLY.

━━━━━━━━━━━━━━━━━━
EXTRACTION RULES
━━━━━━━━━━━━━━━━━━

1. Extract ONLY English substance names.

2. Ignore ALL Korean text completely.

3. Ignore:
- descriptions
- explanations
- notes
- thresholds
- dosage instructions
- comments
- examples
- references
- citations
- URLs
- organizations
- sports names
- medical conditions
- mechanisms
- procedures
- methods
- sentences

4. Extract ONLY:
- actual prohibited substances
- actual prohibited compounds
- actual prohibited drugs
- actual prohibited hormones
- actual prohibited agents

5. Ignore:
- category titles
- section titles
- paragraphs
- prose
- explanatory text

6. Prioritize bullet-listed substances.

7. Substances usually appear as:
- bullet items
- comma-separated lists
- semicolon-separated lists

8. Ignore generic biological concepts unless clearly used as an actual prohibited substance.

9. Ignore:
- "growth factor"
- "gene transfer"
- "oxygen delivery"
- "protein synthesis"
- "vascularisation"
- similar non-substance concepts

10. Deduplicate substances globally.

11. Normalize:
- lowercase
- trim spaces
- remove duplicated spaces

12. Preserve official English naming when possible.

13. Keep abbreviations if officially present:
Examples:
- epo
- dhea
- hgh
- thc
- mk-677

14. Preserve parenthetical aliases ONLY if part of official naming.

15. Ignore page numbers and OCR noise.

16. Ignore malformed OCR fragments.

17. Ignore Korean duplicates of English substances.

18. Do NOT output markdown.

19. Do NOT wrap output in code blocks.

20. Return STRICT VALID MINIFIED JSON ONLY.

━━━━━━━━━━━━━━━━━━
CATEGORY RULES
━━━━━━━━━━━━━━━━━━

Category mapping:

S0 = Non-Approved Substances
S1 = Anabolic Agents
S2 = Peptide Hormones, Growth Factors, Related Substances, and Mimetics
S3 = Beta-2 Agonists
S4 = Hormone and Metabolic Modulators
S5 = Diuretics and Masking Agents
S6 = Stimulants
S7 = Narcotics
S8 = Cannabinoids
S9 = Glucocorticoids
P1 = Beta-Blockers

━━━━━━━━━━━━━━━━━━
PROHIBITION RULES
━━━━━━━━━━━━━━━━━━

If section contains:

"PROHIBITED AT ALL TIMES"
then:
- inGameProhibited = 1
- outGameProhibited = 1

If section contains:

"PROHIBITED IN-COMPETITION"
then:
- inGameProhibited = 1
- outGameProhibited = 0

━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━

[
  {
    "genericEn": "nandrolone",
    "category": "S1",
    "categoryEn": "Anabolic Agents",
    "inGameProhibited": 1,
    "outGameProhibited": 1
  }
]

━━━━━━━━━━━━━━━━━━
STRICT OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━

- Output ONLY JSON.
- No explanations.
- No markdown.
- No comments.
- No trailing commas.
- No additional text.
- No analysis.
- No prose.

━━━━━━━━━━━━━━━━━━
INPUT TEXT
━━━━━━━━━━━━━━━━━━

{{content}}
  `,
} as const;
