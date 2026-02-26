import { describe, expect, test } from "bun:test";

import { parseFromJson } from "./parse.ts";

describe("parseFromJson", () => {
  test("preserves config and integrity blocks", () => {
    const im = parseFromJson(
      JSON.stringify({
        config: {
          cdn: "https://esm.sh",
          target: "es2022",
        },
        imports: {
          react: "https://esm.sh/react@19/es2022/react.mjs",
        },
        integrity: {
          "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
        },
      }),
    );

    expect(im.config).toEqual({
      cdn: "https://esm.sh",
      target: "es2022",
    });
    expect(im.integrity).toEqual({
      "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
    });
  });
});
