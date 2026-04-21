declare module "simple-excel-to-json" {
  interface ParseOption {
    isToCamelCase?: boolean;
    isNested?: boolean;
  }

  class XlsParser {
    constructor(trans?: any[]);
    setTranseform(func: any): void;
    parseXls2Json(
      path: string,
      option?: ParseOption,
      xlsxParseOption?: any
    ): any[][];
  }

  const parser: {
    XlsParser: typeof XlsParser;
    parseXls2Json: (
      path: string,
      option?: ParseOption,
      xlsxParseOption?: any
    ) => any[][];
  };

  export = parser;
}
