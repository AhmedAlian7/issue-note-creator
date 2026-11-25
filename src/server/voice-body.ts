import { z } from "zod";
import { audioLimit, transcriptInput } from "@/ai/contracts";
export class InputFailure extends Error {
  constructor(readonly status: number) {
    super("Invalid voice input");
  }
}
const mime = z.enum(["audio/webm", "audio/mp4"]);
export async function voiceBody(request: Request) {
  const type = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const json = type === "application/json";
  if (!json && !mime.safeParse(type).success) throw new InputFailure(415);
  const limit = json ? 64 * 1024 : audioLimit;
  if (Number(request.headers.get("content-length")) > limit)
    throw new InputFailure(413);
  const blob = await boundedBlob(request, limit, type);
  if (!json) return blob;
  try {
    return z
      .strictObject({ transcript: transcriptInput })
      .parse(JSON.parse(await blob.text())).transcript;
  } catch {
    throw new InputFailure(400);
  }
}
export async function boundedBlob(
  request: Request,
  limit: number,
  type?: string,
) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new InputFailure(413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputFailure(400);
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new InputFailure(413);
      }
      chunks.push(new Uint8Array(value).buffer);
    }
  } finally {
    reader.releaseLock();
  }
  const blob = z
    .instanceof(Blob)
    .refine((b) => b.size > 0)
    .safeParse(new Blob(chunks, { type }));
  if (!blob.success) throw new InputFailure(400);
  return blob.data;
}
