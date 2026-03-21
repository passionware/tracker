import { createFormatService } from "./FormatService.impl.tsx";

/**
 * Storybook / tests: same as real `FormatService`, with an injectable clock.
 * Prefer this over importing `FormatService.impl` from stories.
 */
export function createFormatServiceForStory(now: () => Date = () => new Date()) {
  return createFormatService(now);
}
