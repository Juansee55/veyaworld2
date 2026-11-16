import { describe, it, vi } from "vitest";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { hydrate } from "@tanstack/router-core/ssr/client";

vi.mock("@/styles.css?url", () => ({ default: "/src/styles.css" }));
vi.mock("../styles.css?url", () => ({ default: "/src/styles.css" }));

async function testHydration(path: string) {
  window.scrollTo = () => {};
  const res = await fetch(`http://127.0.0.1:3000${path}`);
  let html = await res.text();
  html = html.replace(/ data-tsd-source="[^"]*"/g, "");

  const match = html.match(/<script data-tsr-stream-part="">([\s\S]*?)<\/script>/);
  const tsrScript = match?.[1]?.replace(/\{let s=document\.currentScript[\s\S]*$/, "") ?? "";

  window.history.replaceState(null, "", path);
  document.open();
  document.write(html);
  document.close();

  if (tsrScript) {
    // eslint-disable-next-line no-new-func
    new Function(tsrScript)();
  }

  const errors: unknown[][] = [];
  const origError = console.error;
  const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args);
    origError("[CAPTURED console.error]", ...args);
  });

  const { getRouter } = await import("@/router");
  const router = getRouter();
  await hydrate(router);

  const root = hydrateRoot(
    document,
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  await new Promise((r) => setTimeout(r, 500));
  root.unmount();
  spy.mockRestore();
  return errors;
}

describe("hydration check", () => {
  it("hydrates route without mismatch", async () => {
    const path = process.env["TEST_PATH"] || "/auth";
    const errors = await testHydration(path);
    expect(errors).toEqual([]);
  });
});
