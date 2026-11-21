import { compareNote } from "./pdf-comparison";
for (const name of ["Template", "Sample-972"] as const)
  await compareNote(name, true);
