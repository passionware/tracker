import { ZodError, ZodType } from "zod";

export function parseWithDataError<Schema extends ZodType>(
  schema: Schema,
  data: unknown,
) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ZodErrorWithData(error.issues, data);
    }
    throw error;
  }
}

export class ZodErrorWithData extends ZodError {
  constructor(
    issues: ZodError["issues"],
    public data: unknown,
  ) {
    super(issues);
    this.data = data;
  }
}

export function extractZodErrorsWithData(
  error: unknown,
  errors: ZodErrorWithData[] = [],
): ZodErrorWithData[] {
  if (error instanceof ZodErrorWithData) {
    return [...errors, error];
  }

  if (error instanceof Error && `errors` in error && error.errors) {
    return Object.values(error.errors).reduce(
      (acc, e) => extractZodErrorsWithData(e, acc),
      errors,
    );
  }

  return errors;
}
