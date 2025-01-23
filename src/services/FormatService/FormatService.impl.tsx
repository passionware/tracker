import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { FormatService } from "@/services/FormatService/FormatService.ts";
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { ReactNode, useEffect, useState } from "react";

export function createFormatService(clock: () => Date): FormatService {
  const amount = (
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
  };
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
      single: {
        compact: (date) => {
          return (
            <SingleWrapper date={date}>
              <div className="flex flex-col text-center gap-1">
                <div>
                  <DayBadge value={format(date, "dd")} />
                  <DotSeparator />
                  <MonthBadge value={format(date, "MM")} />
                  <DotSeparator />
                  <YearBadge value={format(date, "yy")} />
                </div>
              </div>
            </SingleWrapper>
          );
        },
      },
      range: {
        compact: (startDate, endDate) => {
          // 1. Ten sam dzień
          if (isSameDay(startDate, endDate)) {
            return (
              <RangeWrapper from={startDate} to={endDate}>
                <div className="flex flex-col text-center gap-1">
                  <div>
                    <DayBadge value={format(startDate, "dd")} />
                    <DotSeparator />
                    <MonthBadge value={format(startDate, "MM")} />
                    <DotSeparator />
                    <YearBadge value={format(startDate, "yy")} />
                  </div>
                </div>
              </RangeWrapper>
            );
          }

          return (
            <RangeWrapper from={startDate} to={endDate}>
              <div className="flex flex-col text-center gap-1">
                <div>
                  <DayBadge value={format(startDate, "dd")} />
                  <DotSeparator />
                  <MonthBadge value={format(startDate, "MM")} />
                  <DotSeparator />
                  <YearBadge value={format(startDate, "yy")} />
                </div>
                <div>
                  <DayBadge value={format(endDate, "dd")} />
                  <DotSeparator />
                  <MonthBadge value={format(endDate, "MM")} />
                  <DotSeparator />
                  <YearBadge value={format(endDate, "yy")} />
                </div>
              </div>
            </RangeWrapper>
          );
        },
      },
    },
    financial: {
      amount,
      currency: (value) => {
        return amount(value.amount, value.currency);
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
      currencySymbol: (currency: string) => {
        const formatter = new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency,
          currencyDisplay: "symbol",
          minimumFractionDigits: 2,
        });
        return formatter.format(0).split(" ")[1];
      },
    },
  };
}

function DayBadge({ value }: { value: ReactNode }) {
  return (
    <span className="pr-2 last:pr-1 bg-emerald-100 text-emerald-700 border border-black/5 px-1 rounded">
      {value}
    </span>
  );
}

function MonthBadge({ value }: { value: ReactNode }) {
  return (
    <span className="pr-2 last:pr-1 bg-sky-100 text-sky-700 border border-black/5 px-1 rounded">
      {value}
    </span>
  );
}

function YearBadge({ value }: { value: ReactNode }) {
  return (
    <span className="pr-2 last:pr-1 bg-purple-100 text-purple-700 border border-black/5 px-1 rounded">
      {value}
    </span>
  );
}

function DotSeparator() {
  return <span className="text-gray-600 -ml-1.5" />;
}

function RangeWrapper({
  children,
  from,
  to,
  className,
  ...rest
}: {
  children: ReactNode;
  from: Date;
  to: Date;
  className?: string;
}) {
  return (
    <SimpleTooltip
      title={
        <div>
          <div className="font-mono">
            {format(from, "dd.MM.yyyy")} - {format(to, "dd.MM.yyyy")}
          </div>
          <div>
            {getHumanFriendlyDuration(from, to)} ({differenceInDays(to, from)}{" "}
            days)
          </div>
        </div>
      }
    >
      <span
        className={cn(
          "cursor-pointer inline-flex items-center font-mono rounded hover:bg-black/10 hover:-m-1 hover:p-1",
          className,
        )}
        {...rest}
      >
        {children}
      </span>
    </SimpleTooltip>
  );
}
function SingleWrapper({
  children,
  date,
  className,
  ...rest
}: {
  children: ReactNode;
  date: Date;
  className?: string;
}) {
  return (
    <SimpleTooltip
      title={
        <div>
          <div className="font-mono">{format(date, "dd.MM.yyyy")}</div>
        </div>
      }
    >
      <span
        className={cn(
          "cursor-pointer inline-flex items-center font-mono rounded hover:bg-black/10 hover:-m-1 hover:p-1",
          className,
        )}
        {...rest}
      >
        {children}
      </span>
    </SimpleTooltip>
  );
}

function getHumanFriendlyDuration(startDate: Date, endDate: Date) {
  const totalDays = differenceInDays(endDate, startDate);

  // Najpierw sprawdź, czy w ogóle jest różnica > 0
  if (totalDays <= 0) {
    return "0 days";
  }

  // 1. Liczymy dni
  if (totalDays < 7) {
    return `${totalDays} ${totalDays === 1 ? "day" : "days"}`;
  }

  // 2. Liczymy tygodnie
  const weeks = differenceInWeeks(endDate, startDate);
  if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }

  // 3. Liczymy miesiące
  const months = differenceInMonths(endDate, startDate);
  if (months < 12) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  // 4. Wreszcie lata
  const years = differenceInYears(endDate, startDate);
  return `${years} ${years === 1 ? "year" : "years"}`;
}
