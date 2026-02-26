import { describe, expect, setDefaultTimeout, test } from "bun:test";

import { addImport } from "./add.ts";
import { ImportMap } from "./importmap.ts";
import { resolve } from "./resolve.ts";

describe("resolve", () => {
  setDefaultTimeout(15000);

  test("returns original specifier when not matched", () => {
    const im = new ImportMap();
    const [url, ok] = resolve(im, "react", "file:///main.js");
    expect(url).toBe("react");
    expect(ok).toBeFalse();
  });

  test("resolves from top-level imports and scoped imports", async () => {
    const im = new ImportMap();
    await addImport(im, "react-dom@19/client");

    let [modUrl, ok] = resolve(im, "react", "file:///main.js");
    expect(ok).toBeTrue();
    expect(modUrl.startsWith("https://esm.sh/react@19.")).toBeTrue();
    expect(modUrl.endsWith("/es2022/react.mjs")).toBeTrue();

    [modUrl, ok] = resolve(im, "react-dom/client", "file:///main.js");
    expect(ok).toBeTrue();
    expect(modUrl.startsWith("https://esm.sh/*react-dom@19.")).toBeTrue();
    expect(modUrl.endsWith("/es2022/client.mjs")).toBeTrue();

    [, ok] = resolve(im, "react-dom", "file:///main.js");
    expect(ok).toBeFalse();

    [, ok] = resolve(im, "scheduler", "file:///main.js");
    expect(ok).toBeFalse();

    [modUrl, ok] = resolve(im, "react-dom", "https://esm.sh/*react-dom@19.2.4/es2022/client.mjs");
    expect(ok).toBeTrue();
    expect(modUrl.startsWith("https://esm.sh/*react-dom@19.")).toBeTrue();
    expect(modUrl.endsWith("/es2022/react-dom.mjs")).toBeTrue();

    [modUrl, ok] = resolve(im, "scheduler", "https://esm.sh/*react-dom@19.2.4/es2022/client.mjs");
    expect(ok).toBeTrue();
    expect(modUrl.startsWith("https://esm.sh/scheduler@0.27.")).toBeTrue();
    expect(modUrl.endsWith("/es2022/scheduler.mjs")).toBeTrue();
  });

  test("matches longest slash-prefix and does not match subpaths from bare keys", () => {
    const im = new ImportMap();
    im.imports = {
      "foo/": "https://cdn.example.com/foo/",
      "foo/bar/": "https://cdn.example.com/foo-bar/",
      react: "https://esm.sh/react@19.2.0/es2022/react.mjs",
    };

    let [url, ok] = resolve(im, "foo/bar/baz", "file:///main.js");
    expect(ok).toBeTrue();
    expect(url).toBe("https://cdn.example.com/foo-bar/baz");

    [url, ok] = resolve(im, "react/jsx-runtime", "file:///main.js");
    expect(ok).toBeFalse();
    expect(url).toBe("react/jsx-runtime");
  });

  test("preserves query/hash and normalizes relative mapped urls", () => {
    const im = new ImportMap("https://example.com/app/");
    im.imports = {
      local: "./mod.ts",
    };

    const [url, ok] = resolve(im, "local?dev=1#frag", "https://example.com/app/main.ts");
    expect(ok).toBeTrue();
    expect(url).toBe("https://example.com/app/mod.ts?dev=1#frag");
  });

  test("normalizes root-relative mapped urls against base url", () => {
    const im = new ImportMap("https://example.com/app/");
    im.imports = {
      root: "/shared/mod.ts",
    };

    const [url, ok] = resolve(im, "root", "https://example.com/app/main.ts");
    expect(ok).toBeTrue();
    expect(url).toBe("https://example.com/shared/mod.ts");
  });

  test("does not apply prefix mapping when address is not slash-terminated", () => {
    const im = new ImportMap();
    im.imports = {
      "pkg/": "https://cdn.example.com/pkg",
    };

    const [url, ok] = resolve(im, "pkg/subpath", "file:///main.js");
    expect(ok).toBeFalse();
    expect(url).toBe("pkg/subpath");
  });
});
