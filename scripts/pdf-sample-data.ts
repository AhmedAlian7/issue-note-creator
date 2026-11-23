import type { NoteData } from "../src/pdf/note-template";
export const sample: NoteData = {
  customerName: "شركة MENON",
  number: 972,
  date: "16/11/2026",
  lines: [
    "ثلاثية سيدني",
    "ثنائية سيدني",
    "ثنائية جولدي",
    "فوتيه سيدني",
    "كرسي نوبل",
  ].map((productName, i) => ({
    productName,
    quantity: [1, 1, 1, 4, 18][i],
    remarks: i === 4 ? "فندق الكارما" : "استندر",
    redRemark: i === 4,
  })),
};
