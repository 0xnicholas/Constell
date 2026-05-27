import { describe, it, expect } from "vitest";
import { getPrompt } from "../promptClient";

describe("getPrompt", () => {
  it("throws on non-200 response", async () => {
    await expect(getPrompt("http://localhost:9999", "pk", "sk", "missing")).rejects.toThrow();
  });
});
