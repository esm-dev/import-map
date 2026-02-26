import { describe, expect, setDefaultTimeout, test } from "bun:test";

import { addImport } from "./add.ts";
import { createBlankImportMap } from "./blank.ts";

describe("addImport", () => {
  setDefaultTimeout(15000);

  test("adds imports and scoped dependencies", async () => {
    const im = createBlankImportMap();

    await addImport(im, "react@19");
    await addImport(im, "react-dom@19/client");

    const importKeys = Object.keys(im.imports).sort();
    expect(importKeys).toEqual(["react", "react-dom/client"]);

    expect(im.scopes).toBeDefined();
    const scope = im.scopes!["https://esm.sh/"];
    expect(scope).toBeDefined();
    expect(Object.keys(scope).sort()).toEqual(["react-dom", "scheduler"]);
  });

  test("adds peer imports into top-level imports", async () => {
    const im = createBlankImportMap();

    await addImport(im, "react-dom@19");

    const importKeys = Object.keys(im.imports).sort();
    expect(importKeys).toEqual(["react", "react-dom"]);

    expect(im.scopes).toBeUndefined();
  });

  test("respects config.cdn and config.target", async () => {
    const im = createBlankImportMap();
    im.config = {
      cdn: "https://cdn.esm.sh",
      target: "esnext",
    };

    await addImport(im, "react@19");

    const reactUrl = im.imports.react;
    expect(reactUrl).toBeString();
    expect(reactUrl.startsWith("https://cdn.esm.sh/react@19.")).toBeTrue();
    expect(reactUrl.endsWith("/esnext/react.mjs")).toBeTrue();
  });

  test("updates integrity entries for added imports", async () => {
    const im = createBlankImportMap();

    await addImport(im, "react-dom@19/client");

    expect(im.integrity).toBeDefined();
    const entries = Object.entries(im.integrity!);
    expect(entries.length).toBeGreaterThan(0);
    for (const [url, integrity] of entries) {
      expect(url.startsWith("https://esm.sh/")).toBeTrue();
      expect(integrity.startsWith("sha384-")).toBeTrue();
    }
  });

  test("supports noSRI by removing integrity entries", async () => {
    const im = createBlankImportMap();

    await addImport(im, "react@19");
    const reactUrl = im.imports.react;
    expect(im.integrity).toBeDefined();
    expect(im.integrity![reactUrl]).toBeString();
    expect(im.integrity![reactUrl].startsWith("sha384-")).toBeTrue();

    await addImport(im, "react@19", true);

    expect(im.integrity?.[reactUrl]).toBeUndefined();
    expect(im.integrity).toBeUndefined();
  });
});
