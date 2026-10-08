import { languageTag } from "./config";
import { type MessageCode, messageCodes } from "./message-codes";
import english from "./messages/en.json";
import finnish from "./messages/fi.json";

export type TextKey = keyof typeof english;
export type TextValues = Record<string, string | number>;

// English source messages are stable catalog keys; user content is never passed here.
export const createText = (locale: string) =>
  Object.assign(
    (key: TextKey, values: TextValues = {}): string => {
      const message = locale === "fi" ? finnish[key] : english[key];
      return message.replace(/\{(\w+)\}/g, (_match, name: string) =>
        typeof values[name] === "number"
          ? new Intl.NumberFormat(languageTag(locale)).format(values[name])
          : String(values[name] ?? `{${name}}`),
      );
    },
    {
      locale,
      plural: (one: TextKey, other: TextKey, count: number) =>
        createText(locale)(
          new Intl.PluralRules(languageTag(locale)).select(count) === "one"
            ? one
            : other,
          { count },
        ),
      message: (message: string) => translateMessage(locale, message),
      feedback: (state: { message: string; messageCode?: MessageCode }) =>
        state.messageCode
          ? createText(locale)(messageCodes[state.messageCode])
          : translateMessage(locale, state.message),
    },
  );

// Only application-owned messages cross this boundary; unknown provider details
// are already replaced with a generic message by the action error handlers.
export const translateMessage = (locale: string, message: string) =>
  Object.hasOwn(finnish, message)
    ? createText(locale)(message as TextKey)
    : message;
