declare module 'simple-excel-to-json';

class XlsParser {
  constructor(trans) {
    this.transforms = typeof trans !== 'undefined' ? trans : [];
  }

  setTranseform(func) {
    this.transforms = func;
  }

  parseXls2Json(path, option, xlsxParseOption) {
    const obj = xlsx.parse(path, xlsxParseOption); // parses a file
    const xlsDoc = [];

    obj.forEach((e, i) => {
      //sheet
      let isToCamelCase = false;
      if (option && typeof option.isToCamelCase !== 'undefined')
        isToCamelCase = option.isToCamelCase;

      const o = parse(e, this.transforms ? this.transforms[i] : [], isToCamelCase, i);
      if (typeof o !== 'undefined') {
        if (option && option.isNested) {
          xlsDoc.push(convert2NestedObj(o));
        } else {
          xlsDoc.push(o);
        }
      }
    });

    return xlsDoc;
  }
}

export { XlsParser, parseXls2Json };
