/**
 * SQL 값 이스케이프
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
