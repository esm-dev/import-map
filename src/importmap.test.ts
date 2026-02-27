import { describe, expect, test } from "bun:test";

import type { ImportMapRaw } from "../types/index.d.ts";
import { ImportMap } from "./importmap.ts";

describe("ImportMap", () => {
  test("sanitizes invalid values in init maps", () => {
    const init = {
      config: {
        cdn: "https://esm.sh",
        bad: 1,
      },
      imports: {
        react: "https://esm.sh/react@19/es2022/react.mjs",
        bad: true,
      },
      scopes: {
        "https://esm.sh/": {
          scheduler: "https://esm.sh/scheduler@0.27.0/es2022/scheduler.mjs",
          bad: null,
        },
        "https://esm.sh/invalid/": true,
      },
      integrity: {
        "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
        bad: 123,
      },
    } as unknown as ImportMapRaw;
    const im = new ImportMap("file:///", init);

    expect(im.config).toEqual({
      cdn: "https://esm.sh",
    });
    expect(im.imports).toEqual({
      react: "https://esm.sh/react@19/es2022/react.mjs",
    });
    expect(im.scopes).toEqual({
      "https://esm.sh/": {
        scheduler: "https://esm.sh/scheduler@0.27.0/es2022/scheduler.mjs",
      },
    });
    expect(im.integrity).toEqual({
      "https://esm.sh/react@19/es2022/react.mjs": "sha384-abc",
    });
  });

  test("raw returns clean key-ordered raw map", () => {
    const im = new ImportMap();
    im.config = {
      target: "es2022",
      cdn: "https://esm.sh",
    };
    im.imports = {
      z: "https://esm.sh/z",
      a: "https://esm.sh/a",
    };
    im.scopes = {
      "https://esm.sh/b/": {
        zz: "https://esm.sh/zz",
        aa: "https://esm.sh/aa",
      },
      "https://esm.sh/a/": {
        y: "https://esm.sh/y",
        x: "https://esm.sh/x",
      },
    };
    im.integrity = {
      z: "sha384-z",
      a: "sha384-a",
    };

    const raw = im.raw;

    expect(Object.keys(raw)).toEqual(["config", "imports", "scopes", "integrity"]);
    expect(Object.keys(raw.config!)).toEqual(["cdn", "target"]);
    expect(Object.keys(raw.imports!)).toEqual(["a", "z"]);
    expect(Object.keys(raw.scopes!)).toEqual(["https://esm.sh/a/", "https://esm.sh/b/"]);
    expect(Object.keys(raw.scopes!["https://esm.sh/a/"]!)).toEqual(["x", "y"]);
    expect(Object.keys(raw.scopes!["https://esm.sh/b/"]!)).toEqual(["aa", "zz"]);
    expect(Object.keys(raw.integrity!)).toEqual(["a", "z"]);
  });

  test("raw omits empty blocks", () => {
    const im = new ImportMap();
    im.config = {};
    im.scopes = {
      "https://esm.sh/empty/": {},
    };

    expect(im.raw).toEqual({});
  });
});
