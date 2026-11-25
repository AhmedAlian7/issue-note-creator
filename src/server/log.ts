import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const requests = new AsyncLocalStorage<string>();
export const withRequestId = requests.run.bind(requests);
export const log = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin: () => {
    const requestId = requests.getStore();
    return requestId ? { requestId } : {};
  },
});
