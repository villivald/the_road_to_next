import { getLocale } from "next-intl/server";
import { createText } from "./text";

export const getText = async () => createText(await getLocale());
