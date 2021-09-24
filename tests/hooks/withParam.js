const assert = require("assert");
const withParam = require("../../src/hooks/withParam");

describe("withParam", () => {
  it("Merges the param", async () => {
    const context = {
      params: { name: "Gene Autry" },
    };

    const newContext = await withParam({
      addedProp: "Conway Twitty",
    })(context);

    await assert.deepEqual(newContext.params, {
      name: "Gene Autry",
      addedProp: "Conway Twitty",
    });
  });

  it("Works when `context.data` is an array", async () => {
    const context = {
      params: {},
      data: [{ name: "June Carter" }, { name: "Loretta Lynn" }],
    };

    const newContext = await withParam({
      addedProp: "Dolly Parton",
    })(context);

    await assert.deepEqual(
      newContext.params.addedProp,
      "Dolly Parton"
    );
  });

  it("Allows manipulation at for each item when `context.data is an array`", async () => {
    const context = {
      params: {},
      data: [{ name: "June Carter" }, { name: "Loretta Lynn" }],
    };

    const newContext = await withParam(
      {
        addedProp: (params) => {
          params.addedProp.push("Dolly Parton");
        },
      },
      (context) => {
        context.params.addedProp = [];
        return context;
      }
    )(context);

    await assert.deepEqual(newContext.params.addedProp, ["Dolly Parton"]);
  });
});
