/**
 * 빈 값을 SQL NULL로 변환하고 문자열의 작은따옴표를 이스케이프한다.
 */
export function getSafeValue(val: any) {
  const isNullValue = val === undefined || val === null;

  if (isNullValue) {
    return "NULL";
  }

  const isStringValue = typeof val === "string";

  if (isStringValue) {
    return `'${val.replace(/'/g, "''")}'`;
  }

  return val;
}
