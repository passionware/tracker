import { FormatService } from "@/services/FormatService/FormatService.ts";
import { differenceInDays, format, startOfDay } from "date-fns";
import { useEffect, useState } from "react";

export function createFormatService(clock: () => Date): FormatService {
  return {
    temporal: {
      date: (date: Date) => {
        try {
          return format(date, "dd.MM.yyyy");
        } catch (e) {
          console.log(e);
          return `error: ${e}`;
        }
      },
      time: (date: Date) => format(date, "HH:mm:ss"),
      datetime: (date: Date) => format(date, "dd.MM.yyyy HH:mm:ss"),
      relative: {
        useDaysLeft: (date) => {
          const normalizedTargetDate = startOfDay(date);

          const [daysLeft, setDaysLeft] = useState(() =>
            differenceInDays(normalizedTargetDate, startOfDay(clock())),
          );

          useEffect(() => {
            const updateDaysLeft = () => {
              setDaysLeft(
                differenceInDays(normalizedTargetDate, startOfDay(clock())),
              );
            };

            // Calculate the time until the next midnight
            const now = clock();
            const nextMidnight = startOfDay(
              new Date(now.getTime() + 24 * 60 * 60 * 1000),
            );
            const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

            // Update immediately
            updateDaysLeft();

            // Set timeout for midnight update
            const timeout = setTimeout(() => {
              updateDaysLeft();

              // Set interval for daily updates
              const interval = setInterval(updateDaysLeft, 24 * 60 * 60 * 1000);
              return () => clearInterval(interval);
            }, timeUntilMidnight);

            return () => clearTimeout(timeout);
          }, [normalizedTargetDate]);

          return daysLeft;
        },
      },
    },
    financial: {
      amount: (
        value: number,
        currency: "EUR" | "USD" | string,
        fullPrecision = false,
      ) => {
        const formatter = new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency,
          currencyDisplay: "symbol",
          minimumFractionDigits: 2,
        });

        // eslint-disable-next-line no-compare-neg-zero
        const clearedValue = value === -0 ? 0 : value;

        let formattedValue = formatter.format(clearedValue);

        if (fullPrecision && clearedValue > 0 && clearedValue < 0.01) {
          formattedValue = `<${formatter.format(0.01)}`;
        }

        const result = formattedValue.split(" ");
        const currencySymbol = result[1];
        const currencyValue = result[0];
        const text = `${currencySymbol}${currencySymbol.match(/^[A-z]+$/) ? " " : ""}${currencyValue}`;

        return <div className="font-mono ">{text}</div>;
        // return (
        //   <div className="flex flex-row gap-1 justify-end">
        //     <div>{result[0]}</div>
        //     <div className="w-8 text-left">{result[1]}</div>
        //   </div>
        // );
        // Adjust currency placement based on the currency type
        // if (currency === "EUR") {
        // Move the symbol to the end for EUR
        // return formattedValue.replace("€", "") + "€";
        // } else if (currency === "PLN") {
        //   // Handle PLN by moving the currency to the end and adding a space
        //   return formattedValue.replace("PLN", "").trim() + " PLN";
        // }
        //
        // // USD format remains unchanged as it matches the desired output
        // return formattedValue;
      },
      amountWithoutCurrency: (value: number, fullPrecision = false) => {
        const formatter = new Intl.NumberFormat("de-DE", {
          style: "decimal",
          minimumFractionDigits: 0,
        });

        let formattedValue = formatter.format(value);

        if (fullPrecision && value > 0 && value < 0.01) {
          formattedValue = `<${formatter.format(0.01)}`;
        }

        return formattedValue;
      },
    },
  };
}
