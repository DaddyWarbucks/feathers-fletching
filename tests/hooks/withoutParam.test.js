const assert = require("assert");
const withoutParam = require("../../src/hooks/withoutParam");

describe("withoutParam", () => {
  it("Removes values from `context.params`", async () => {
    const context = {
      params: { name: "Johnny Cash", email: "email@example.com" },
    };

    const newContext = await withoutParam({
      email: false
    })(context);

    await assert.deepEqual(newContext.params, { name: "Johnny Cash" });
  });

  it("Works when `context.data` is an array", async () => {
    const context = {
      data: [
        { name: "Johnny Cash", email: "email@example.com" },
        { name: "Patsy Cline", email: "email@example.com" },
      ],
      params: {
        lonelyParam: "Bobby Vinton",
      },
    };

    const newContext = await withoutParam({
      email: false
    })(context);

    await assert.deepEqual(newContext.params, {
      lonelyParam: "Bobby Vinton",
    });
  });

  it("Works when `virtuals` is an array", async () => {
    const context = {
      params: { name: "Johnny Cash", email: "email@example.com" },
    };

    const newContext = await withoutParam(["email"])(context);

    await assert.deepEqual(newContext.params, { name: "Johnny Cash" });
  });
});
