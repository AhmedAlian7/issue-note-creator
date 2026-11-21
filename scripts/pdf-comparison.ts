import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { renderNotePdf } from "../src/pdf/render-note-pdf";
import { sample } from "./pdf-sample-data";
export async function compareNote(
  name: "Template" | "Sample-972",
  previews = false,
) {
  const dir = "tests/output/" + name;
  await mkdir(dir, { recursive: true });
  await writeFile(
    dir + "/actual.pdf",
    await renderNotePdf(name === "Template" ? null : sample),
  );
  execFileSync("pdftoppm", [
    "-r",
    "150",
    "-png",
    "-singlefile",
    dir + "/actual.pdf",
    dir + "/actual",
  ]);
  const expectedBytes = await readFile("tests/fixtures/" + name + ".png");
  await writeFile(dir + "/expected.png", expectedBytes);
  const expected = PNG.sync.read(expectedBytes),
    actual = PNG.sync.read(await readFile(dir + "/actual.png"));
  const { width, height } = expected;
  if (width !== actual.width || height !== actual.height)
    throw Error(
      "Raster dimensions differ for " +
        name +
        ": " +
        actual.width +
        " × " +
        actual.height,
    );
  const diff = new PNG({ width, height });
  const pixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    width,
    height,
    { includeAA: false, threshold: 0.1 },
  );
  await writeFile(dir + "/diff.png", PNG.sync.write(diff));
  if (previews) {
    const side = new PNG({ width: width * 2, height }),
      overlay = new PNG({ width, height });
    PNG.bitblt(expected, side, 0, 0, width, height, 0, 0);
    PNG.bitblt(actual, side, 0, 0, width, height, width, 0);
    for (let i = 0; i < overlay.data.length; i++)
      overlay.data[i] = Math.round((expected.data[i] + actual.data[i]) / 2);
    await writeFile(dir + "/side-by-side.png", PNG.sync.write(side));
    await writeFile(dir + "/overlay.png", PNG.sync.write(overlay));
  }
  const percentage = (100 * pixels) / (width * height);
  console.log(
    name + ": " + percentage.toFixed(5) + "% (" + pixels + " pixels)",
  );
  return percentage;
}
