export function isObjectNumeric(o: Object | number): boolean {

  if (typeof o == "number") return true;
  if (typeof o == "object") return Object.values(o).every((value: any) => isObjectNumeric(value));

  return false;
}
