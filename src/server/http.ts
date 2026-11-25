import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ar } from "@/lib/i18n";
import { log, withRequestId } from "./log";
import { boundedBlob, InputFailure } from "./voice-body";

export function apiRoute<Args extends unknown[]>(
  name: string,
  handler: (request: Request, ...args: Args) => Promise<Response>,
  acceptsQuery = false,
) {
  return (request: Request, ...args: Args) =>
    withRequestId(
      request.headers.get("x-request-id") ?? randomUUID(),
      async () => {
        const start = Date.now();
        let response: Response;
        try {
          const search = new URL(request.url).search;
          if (search.length > 8192) throw new InputFailure(414);
          const params = new URLSearchParams(search);
          if (
            new Set(params.keys()).size !== params.size ||
            (!acceptsQuery &&
              !z.strictObject({}).safeParse(Object.fromEntries(params)).success)
          )
            throw new InputFailure(400);
          response = await handler(request, ...args);
        } catch (error) {
          if (error instanceof InputFailure) {
            response = Response.json(
              { error: ar.invalid },
              { status: error.status },
            );
          } else {
            log.error(
              {
                route: name,
                errorType: error instanceof Error ? error.name : "Unknown",
              },
              "Request failed",
            );
            response = Response.json(
              { error: ar.notes.error },
              { status: 500 },
            );
          }
        }
        log.info(
          {
            route: name,
            method: request.method,
            status: response.status,
            durationMs: Date.now() - start,
          },
          "Request completed",
        );
        return response;
      },
    );
}

export async function boundedJson(request: Request, limit: number) {
  const type = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (type !== "application/json") throw new InputFailure(415);
  const body = await boundedBlob(request, limit);
  try {
    return JSON.parse(await body.text()) as unknown;
  } catch {
    throw new InputFailure(400);
  }
}
