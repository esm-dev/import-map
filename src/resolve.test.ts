import { describe, expect, setDefaultTimeout, test } from "bun:test";

import { addImport } from "./add.ts";
import { createBlankImportMap } from "./blank.ts";
import { resolve } from "./resolve.ts";

describe("resolve", () => {
  setDefaultTimeout(15000);

  test("does not throw when scopes are missing", () => {
    const im = createBlankImportMap();
    const [url, ok] = resolve(im, "react", "file:///main.js");
    expect(url).toBe("react");
    expect(ok).toBeFalse();
  });

  test("resolves from top-level imports and scoped imports", async () => {
    const im = createBlankImportMap();
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
    const im = createBlankImportMap();
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
});
