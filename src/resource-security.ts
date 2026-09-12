import { z } from 'zod';

const resourceIdSchema = z.string().uuid();

/** Validate template parameters before they are interpolated into an API path. */
export function encodeResourceId(value: string | string[] | undefined): string {
  if (typeof value !== 'string') {
    throw new Error('Resource id must be a single UUID');
  }

  const parsed = resourceIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Resource id must be a valid UUID');
  }

  return encodeURIComponent(parsed.data);
}
