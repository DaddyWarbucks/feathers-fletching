import type { SanitizeSchema } from '../utils';
import { skippable, sanitize } from '../utils';

export type SanitizeResultOptions =
  | SanitizeSchema
  | ((context: any) => SanitizeSchema);

export const sanitizeResult = (options: SanitizeResultOptions) => {
  return skippable('sanitizeResult', async (context) => {
    const schema =
      typeof options === 'function' ? await options(context) : options;
    context.result = sanitize(context.result, schema);
    return context;
  });
};
