import { expect, it } from "vitest";
import { operationsTarget } from "../scripts/lib/operations-target";

const expected = {
  host: "127.0.0.1",
  port: "55433",
  database: "wishlist_test",
  schema: "wishlist",
};
const url =
  "postgresql://fixture:secret@127.0.0.1:55433/wishlist_test?schema=wishlist";

it("requires an explicit match before any database connection", () => {
  expect(operationsTarget(url, expected)).toEqual(expected);
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    expect(() =>
      operationsTarget(url, { ...expected, [key]: undefined }),
    ).toThrow();
    expect(() =>
      operationsTarget(url, { ...expected, [key]: "wrong" }),
    ).toThrow();
  }
  expect(() => operationsTarget(undefined, expected)).toThrow();
  // node-postgres allows query parameters to override the URL's host/port.
  expect(() =>
    operationsTarget(`${url}&host=hosted.example`, expected),
  ).toThrow();
  expect(() => operationsTarget(`${url}&port=5432`, expected)).toThrow();
});
