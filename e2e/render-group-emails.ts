// Run with tsx so email templates use the same JSX and JSON loading as services.
import { createElement } from "react";
import { render } from "react-email";
import GroupEmail from "../src/emails/reservation/group";
import { assertTestDatabase, testOrigin } from "./environment";

assertTestDatabase(process.env);
const previews = await Promise.all(
  ["en", "fi"].flatMap((locale) =>
    (["INVITED", "ACCEPTED"] as const).map(async (kind) => {
      const url = `${testOrigin}/${locale}/reservations/example`;
      return {
        locale,
        kind,
        url,
        html: await render(
          createElement(GroupEmail, {
            kind,
            actorName: "Demo Friend",
            locale,
            url,
          }),
        ),
      };
    }),
  ),
);
console.log(JSON.stringify(previews));
