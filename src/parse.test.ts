import { describe, expect, test } from "bun:test";

import { importMapFrom, parseImportMapFromJson } from "./parse.ts";

describe("parseImportMapFromJson", () => {
  test("preserves config and integrity blocks", () => {
    const im = parseImportMapFromJson(
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

describe("importMapFrom", () => {
  test("preserves config and integrity and drops non-string values", () => {
    const im = importMapFrom({
      config: {
        cdn: "https://esm.sh",
        target: "esnext",
        bad: 1,
      },
      integrity: {
        "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
        bad: true,
      },
    });

    expect(im.config).toEqual({
      cdn: "https://esm.sh",
      target: "esnext",
    });
    expect(im.integrity).toEqual({
      "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
    });
  });
});
