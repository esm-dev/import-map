import { describe, expect, setDefaultTimeout, spyOn, test } from "bun:test";

import { ImportMap } from "./importmap.ts";
import { addImport } from "./add.ts";

describe("addImport", () => {
  setDefaultTimeout(15000);

  test("adds imports and scoped dependencies", async () => {
    const im = new ImportMap();

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
    const im = new ImportMap();

    await addImport(im, "react-dom@19");

    const importKeys = Object.keys(im.imports).sort();
    expect(importKeys).toEqual(["react", "react-dom"]);

    expect(im.scopes).toEqual({});
  });

  test("respects config.cdn and config.target", async () => {
    const im = new ImportMap();
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
    const im = new ImportMap();

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
    const im = new ImportMap();

    await addImport(im, "react@19", true);

    const reactUrl = im.imports.react;
    expect(im.integrity?.[reactUrl]).toBeUndefined();
    expect(im.integrity).toEqual({});
  });

  test("warns on unmet peer dependency", async () => {
    const im = new ImportMap();
    im.imports.peer = "https://esm.sh/peer@1.0.0/es2022/peer.mjs";

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      (async (input: unknown) => {
        const url = input instanceof URL ? input.toString() : input instanceof Request ? input.url : String(input);
        if (url === "https://esm.sh/pkg@1?meta" || url === "https://esm.sh/pkg@1.0.0?meta") {
          return new Response(
            JSON.stringify({
              name: "pkg",
              version: "1.0.0",
              module: "/pkg@1.0.0/es2022/pkg.mjs",
              integrity: "sha384-pkg",
              exports: [],
              imports: [],
              peerImports: ["/peer@^2.0.0"],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://esm.sh/*pkg@1?meta" || url === "https://esm.sh/*pkg@1.0.0?meta") {
          return new Response(
            JSON.stringify({
              name: "pkg",
              version: "1.0.0",
              module: "/pkg@1.0.0/es2022/pkg.mjs",
              integrity: "sha384-pkg-ext",
              exports: [],
              imports: [],
              peerImports: ["/peer@^2.0.0"],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }) as typeof fetch,
    );

    const warn = spyOn(console, "warn").mockImplementation(() => {});

    await addImport(im, "pkg@1");

    expect(warn).toHaveBeenCalled();
    expect(
      warn.mock.calls.some(
        ([msg]) => typeof msg === "string" && msg.includes("incorrect peer dependency(unmeet"),
      ),
    ).toBeTrue();

    warn.mockRestore();
    fetchMock.mockRestore();
  });

  test("removes scope specifiers duplicated in imports except exact-version scopes", async () => {
    const im = new ImportMap();
    im.imports.shared = "https://esm.sh/shared@1.0.0/es2022/shared.mjs";
    im.scopes["https://esm.sh/"] = {
      shared: "https://esm.sh/shared@1.0.0/es2022/shared.mjs",
      onlyInScope: "https://esm.sh/only-in-scope@1.0.0/es2022/only-in-scope.mjs",
    };
    im.scopes["https://esm.sh/pkg2@1.0.0/"] = {
      shared: "https://esm.sh/shared@1.0.0/es2022/shared.mjs",
    };

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      (async (input: unknown) => {
        const url = input instanceof URL ? input.toString() : input instanceof Request ? input.url : String(input);
        if (url === "https://esm.sh/pkg2@1?meta" || url === "https://esm.sh/pkg2@1.0.0?meta") {
          return new Response(
            JSON.stringify({
              name: "pkg2",
              version: "1.0.0",
              module: "/pkg2@1.0.0/es2022/pkg2.mjs",
              integrity: "sha384-pkg2",
              exports: [],
              imports: [],
              peerImports: [],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }) as typeof fetch,
    );

    await addImport(im, "pkg2@1");

    expect(im.scopes["https://esm.sh/"]!.shared).toBeUndefined();
    expect(im.scopes["https://esm.sh/"]!.onlyInScope).toBeString();
    expect(im.scopes["https://esm.sh/pkg2@1.0.0/"]!.shared).toBeString();

    fetchMock.mockRestore();
  });
});
