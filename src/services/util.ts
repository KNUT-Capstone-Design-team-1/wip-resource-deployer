export function convertStringToInt8Array(
  int8ArrayFormatString: string
): Int8Array {
  const res = int8ArrayFormatString.match(/-?\d+/g)?.map(Number);

  return new Int8Array(res ?? []);
}
