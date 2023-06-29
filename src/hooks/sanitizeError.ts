import type { SanitizeSchema } from '../utils';
import { skippable, sanitize } from '../utils';

export type SanitizeErrorOptions =
  | SanitizeSchema
  | ((context: any) => SanitizeSchema);

export const sanitizeError = (options: SanitizeErrorOptions) => {
  return skippable('sanitizeError', async (context) => {
    const schema =
      typeof options === 'function' ? await options(context) : options;
    context.error = sanitize(context.error, schema);
    return context;
  });
};
