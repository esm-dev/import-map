import { describe, expect, test } from "bun:test";

import { ImportMap } from "./importmap.ts";

describe("ImportMap", () => {
  test("isBlank reflects imports/scopes state", () => {
    const im = new ImportMap();
    expect(im.isBlank).toBeTrue();

    im.imports = {
      react: "https://esm.sh/react@19.2.4/es2022/react.mjs",
    };
    expect(im.isBlank).toBeFalse();

    im.imports = {};
    im.scopes = {
      "https://esm.sh/": {
        scheduler: "https://esm.sh/scheduler@0.27.0/es2022/scheduler.mjs",
      },
    };
    expect(im.isBlank).toBeFalse();
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
