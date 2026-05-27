import { test, expect } from "vitest";
import { scoresRouter } from "../../../server/api/routers/scores";

test("scores.configList returns empty array when no configs", async () => {
  const ctx = {
    session: {
      user: { id: "u1", email: "a@b.com", name: null, image: null },
      projectId: "proj-test",
      expires: "2099-01-01",
    },
    apiKey: null,
  };
  const caller = scoresRouter.createCaller(ctx as any);

  const result = await caller.configList({});
  expect(result).toEqual([]);
});
