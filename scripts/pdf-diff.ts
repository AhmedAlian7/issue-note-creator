import { closeChromium } from "../src/pdf/chromium";
import { compareNote } from "./pdf-comparison";
try {
  for (const name of ["Template", "Sample-972"] as const)
    await compareNote(name, true);
} finally {
  await closeChromium();
}
