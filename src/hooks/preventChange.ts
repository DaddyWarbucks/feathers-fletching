import { GeneralError } from "@feathersjs/errors";
import {
  omit,
  skippable,
  checkContext,
  virtualsSerializer,
  filterResolver,
} from "../utils";

export const preventChange = (virtuals, prepFunc = () => {}) => {
  return skippable("preventChange", async (context) => {
    checkContext(context, "before", ["update", "patch"], "preventChange");

    if (!context.data) {
      return context;
    }

    if (Array.isArray(virtuals)) {
      context.data = Array.isArray(context.data)
        ? context.data.map((d) => omit(d, virtuals))
        : omit(context.data, virtuals);
    } else {
      context.data = await virtualsSerializer(
        filterResolver,
        context.data,
        virtuals,
        context,
        prepFunc
      );
    }

    if (context.method === "update") {
      if (!context.service._patch) {
        throw new GeneralError(
          "Cannot call `preventChange` hook on `update` method if the service does not have a `_patch` method"
        );
      }
      context.result = await context.service._patch(
        context.id,
        context.data,
        context.params
      );
    }

    return context;
  });
};
