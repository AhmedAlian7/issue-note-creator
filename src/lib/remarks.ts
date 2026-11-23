import { ar } from "./i18n";

export function canColorRemark(remarks: string | null | undefined) {
  const text = remarks?.trim();
  return !!text && text !== ar.notes.defaultRemarks;
}
