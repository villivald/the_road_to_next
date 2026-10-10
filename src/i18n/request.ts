import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => ({
  locale: resolveLocale(await requestLocale),
  messages: {},
  timeZone: "UTC",
}));
