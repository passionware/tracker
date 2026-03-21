/** Create a `const` variable with this name (Variables UI) — your Gemini API key. */
export const GEMINI_API_KEY_VARIABLE_NAME = "GEMINI_API_KEY" as const;

/**
 * Optional `const` variable: model id, e.g. `gemini-2.5-flash`, `gemini-2.5-pro`.
 * If unset, {@link DEFAULT_GEMINI_MODEL} is used.
 *
 * Note: `*-flash-lite` models are cheaper/faster but weaker on careful document
 * grounding; bank matching defaults to full Flash. For harder PDFs/CSVs, try
 * `gemini-2.5-pro` via this variable.
 */
export const GEMINI_MODEL_VARIABLE_NAME = "GEMINI_MODEL" as const;

/** Default: full Flash (better grounding than `gemini-2.5-flash-lite`). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
