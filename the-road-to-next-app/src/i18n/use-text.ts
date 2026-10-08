import { useLocale } from "next-intl";
import { createText } from "./text";

export const useText = () => createText(useLocale());
