import { extractZodErrorsWithData } from "@/platform/zod/parseWithDataError.ts";
import { ZodErrorDisplay } from "@/platform/zod/ZodErrorDisplay.tsx";
import { maybe } from "@passionware/monads";

export function ErrorMessageRenderer({ error }: { error: Error }) {
  const zodErrors = extractZodErrorsWithData(error);
  return maybe.mapOrElse(
    maybe.fromArray(zodErrors),
    (errors) =>
      errors.map((error) => (
        <ZodErrorDisplay zodError={error} json={error.data} />
      )),
    "errors" in error && error.errors && typeof error.errors === "object" ? (
      <div>
        <h1>Combined Error</h1>
        {Object.entries(error.errors).map(([key, value]) => {
          return (
            <div key={key} className="pl-4 border-l-2 border-gray-300">
              <h4>{key}</h4>
              <ErrorMessageRenderer error={value} />
            </div>
          );
        })}
      </div>
    ) : (
      <>Error: {error.message}</>
    ),
  );
}
