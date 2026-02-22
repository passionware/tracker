/**
 * Shared rate parsing for expression variables (e.g. vars.new_hour_cost_rate, vars.new_hour_billing_rate).
 * Supports:
 * - Simple string: "100 EUR"
 * - JSON array with per-project rates: [{ projectIds: ['id1'], rate: '123 eur' }, { projectIds: [], rate: '100 eur' }]
 *   (empty projectIds = fallback/default rate)
 */

export type ParsedRate = { rate: number; currency: string };

/**
 * Parses a single rate string (e.g. "100 EUR", "123.5 eur").
 * Currency is required (3-letter code).
 */
export function parseSimpleRate(rateString: string): ParsedRate {
  const match = String(rateString)
    .trim()
    .match(/^([\d.,]+)\s*([A-Za-z]{3})$/);
  if (!match) {
    throw new Error(`Invalid rate string: ${rateString}`);
  }
  const parts = match
    ? [match[1], match[2]]
    : String(rateString).trim().split(/\s+/);
  return {
    rate: parseFloat(parts[0]) || 0,
    currency: (parts[1] || "EUR").toUpperCase(),
  };
}

/**
 * Parses rate configuration that can be a simple string or a JSON array keyed by TMetric project ID.
 * @param rateConfig - Raw value from expression (e.g. "100 EUR" or '[{"projectIds":["123"],"rate":"100 EUR"}]')
 * @param tmetricProjectId - TMetric project ID used to look up the rate in JSON format
 */
export function parseRateConfiguration(
  rateConfig: string,
  tmetricProjectId: string,
): ParsedRate {
  try {
    const parsed = JSON.parse(rateConfig);
    if (Array.isArray(parsed)) {
      type ConfigItem = { projectIds?: Array<string | number>; rate?: string };
      const matchingConfig = parsed.find((config: ConfigItem) => {
        if (!config.projectIds || config.projectIds.length === 0) {
          return false;
        }
        return (
          config.projectIds.includes(tmetricProjectId) ||
          config.projectIds.includes(Number(tmetricProjectId)) ||
          config.projectIds.some((id) => String(id) === tmetricProjectId)
        );
      });
      if (matchingConfig?.rate) {
        return parseSimpleRate(matchingConfig.rate);
      }
      const fallbackConfig = parsed.find(
        (config: ConfigItem) => !config.projectIds || config.projectIds.length === 0,
      );
      if (fallbackConfig?.rate) {
        return parseSimpleRate(fallbackConfig.rate);
      }
      throw new Error(
        `No matching rate found for TMetric project ID "${tmetricProjectId}" in rate configuration: ${rateConfig}`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("No matching rate found")
    ) {
      throw error;
    }
  }
  return parseSimpleRate(rateConfig);
}
