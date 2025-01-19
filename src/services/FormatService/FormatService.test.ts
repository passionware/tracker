/* @jest-environment jsdom */
import { act, render, renderHook } from "@testing-library/react";
import { toZonedTime } from "date-fns-tz";
import { describe, expect, it, vi } from "vitest";
import { createFormatService } from "./FormatService.impl.tsx";

describe("FormatService", () => {
  const formatService = createFormatService(() => new Date());
  const timeZone = "GMT-0"; // Set your desired time zone (for Poland in this case)

  describe("temporal", () => {
    it("should format date correctly", () => {
      // Create a date in a specific time zone
      const date = toZonedTime("2024-10-07T00:00:00Z", timeZone);
      const formattedDate = formatService.temporal.date(date);
      expect(formattedDate).toBe("07.10.2024");
    });

    it("should format time correctly", () => {
      // Create a time in a specific time zone
      const date = toZonedTime("2024-10-07T12:34:56Z", timeZone);
      const formattedTime = formatService.temporal.time(date);
      expect(formattedTime).toBe("12:34:56"); // Expecting the time in the given time zone
    });

    it("should format datetime correctly", () => {
      // Create a datetime in a specific time zone
      const date = toZonedTime("2024-10-07T12:34:56Z", timeZone);
      const formattedDatetime = formatService.temporal.datetime(date);
      expect(formattedDatetime).toBe("07.10.2024 12:34:56");
    });

    describe("relative", () => {
      describe("useDaysLeft", () => {
        it("should calculate days left correctly", () => {
          vi.useFakeTimers();
          let currentTime = new Date("2024-10-01T10:00:00");
          const clock = () => currentTime; // Custom clock function
          const formatService = createFormatService(clock);
          const targetDate = new Date("2024-10-07T00:00:00");

          const { result } = renderHook(() =>
            formatService.temporal.relative.useDaysLeft(targetDate),
          );

          expect(result.current).toBe(6);

          act(() => {
            // Forward 14 hours
            currentTime = new Date("2024-10-02T00:00:00");
            vi.advanceTimersByTime(14 * 60 * 60 * 1000);
          });

          expect(result.current).toBe(5);

          act(() => {
            // Forward 24 hours minus 1 second
            currentTime = new Date("2024-10-02T23:59:59");
            vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 1000);
          });

          expect(result.current).toBe(5);

          act(() => {
            // Forward 1 second
            currentTime = new Date("2024-10-03T00:00:00");
            vi.advanceTimersByTime(1000);
          });

          expect(result.current).toBe(4);

          vi.useRealTimers();
        });

        it("should handle same-day target correctly", () => {
          vi.useFakeTimers();
          const currentTime = new Date("2024-10-01T10:00:00");
          const clock = () => currentTime; // Custom clock function
          const formatService = createFormatService(clock);
          const targetDate = new Date("2024-10-01T23:59:59");

          const { result } = renderHook(() =>
            formatService.temporal.relative.useDaysLeft(targetDate),
          );

          expect(result.current).toBe(0);

          vi.useRealTimers();
        });

        it("should rerender when the days left changes at midnight", () => {
          vi.useFakeTimers();
          let currentTime = new Date("2024-10-01T22:00:00");
          const clock = () => currentTime; // Custom clock function
          const formatService = createFormatService(clock);
          const targetDate = new Date("2024-10-07T00:00:00");

          const { result } = renderHook(() =>
            formatService.temporal.relative.useDaysLeft(targetDate),
          );

          expect(result.current).toBe(6);

          act(() => {
            // forward 2 hours minus 1 second
            currentTime = new Date("2024-10-01T23:59:59");
            vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1000);
          });

          expect(result.current).toBe(6);

          act(() => {
            // forward 1 second
            currentTime = new Date("2024-10-02T00:00:00");
            vi.advanceTimersByTime(1000);
          });

          expect(result.current).toBe(5);

          vi.useRealTimers();
        });
      });
    });
  });

  describe("financial", () => {
    it("should format financial amount in EUR correctly", () => {
      const formattedAmount = formatService.financial.amount(1234.56, "EUR");
      const screen = render(formattedAmount);

      expect(screen.container.textContent).toBe("€1.234,56");
    });

    it("should format financial amount in USD correctly", () => {
      const formattedAmount = formatService.financial.amount(1234.56, "USD");
      const screen = render(formattedAmount);
      expect(screen.container.textContent).toBe("$1.234,56");
    });

    it("should format negative zero", () => {
      const formattedAmount = formatService.financial.amount(-0, "USD");
      const screen = render(formattedAmount);
      expect(screen.container.textContent).toBe("$0,00");
    });

    it("should format financial amount in a custom currency correctly", () => {
      const formattedAmount = formatService.financial.amount(1234.56, "PLN");
      const screen = render(formattedAmount);
      expect(screen.container.textContent).toBe("PLN1.234,56");
    });
  });
});
