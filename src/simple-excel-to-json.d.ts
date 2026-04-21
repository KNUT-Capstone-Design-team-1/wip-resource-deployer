declare module "simple-excel-to-json" {
  // 라이브러리의 실제 구조에 맞게 최소한으로 정의
  const parseXls2Json: (path: string, option?: any, xlsxParseOption?: any) => any[][];
  const XlsParser: any;

  const _default: {
    parseXls2Json: typeof parseXls2Json;
    XlsParser: typeof XlsParser;
  };

  export default _default;
}
