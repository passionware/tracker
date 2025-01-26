import {
  SimpleTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { Slot } from "@radix-ui/react-slot";
import React, { useRef } from "react";
import { ZodError, ZodIssue } from "zod";

type JsonTreeProps = {
  json: unknown;
  zodError: ZodError;
};

type IssuesByPath = Record<string, ZodIssue[]>;

export const ZodErrorDisplay: React.FC<JsonTreeProps> = ({
  json,
  zodError,
}) => {
  const firstErrorPathRef = useRef<string | null>(null);

  const issuesByPath: IssuesByPath =
    zodError.issues.reduce<IssuesByPath>((acc, issue) => {
      const path = issue.path.join(".");
      const parentPath = issue.path.slice(0, -1).join(".");

      if (!acc[path]) acc[path] = [];
      acc[path].push(issue);

      if (!acc[parentPath]) acc[parentPath] = [];
      acc[parentPath].push(issue);

      // Save the first error path
      if (!firstErrorPathRef.current) {
        firstErrorPathRef.current = path;
      }

      return acc;
    }, {}) || {};

  const scrollToError = () => {
    if (firstErrorPathRef.current) {
      window.location.hash = `#${firstErrorPathRef.current}`;
      const element = document.querySelector(
        `[data-error-path="${firstErrorPathRef.current}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderTree = (data: unknown, path = ""): React.ReactNode => {
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data)) {
        return (
          <ul className="pl-4 border-l-2 border-gray-300">
            {data.map((item, index) => {
              const itemPath =
                path === "" ? index.toString() : `${path}.${index}`;
              return (
                <li key={index} className="mt-1" data-error-path={itemPath}>
                  {renderNode(item, itemPath, index.toString())}
                </li>
              );
            })}
          </ul>
        );
      } else {
        return (
          <ul className="pl-4 border-l-2 border-gray-300">
            {Object.entries(data).map(([key, value]) => {
              const keyPath = `${path}${path ? "." : ""}${key}`;
              return (
                <li key={key} className="mt-1">
                  {renderNode(value, keyPath, key)}
                </li>
              );
            })}
          </ul>
        );
      }
    } else {
      return renderNode(data, path, "root");
    }
  };

  const renderNode = (
    value: unknown,
    path: string,
    label: string,
  ): React.ReactNode => {
    const errors = issuesByPath[path];
    const hasError = Boolean(errors);
    const labelElement = <span className="text-blue-500">{label}: </span>;
    const element = (
      <div
        id={path}
        className={cn("inline-block p-1", {
          "text-red-500 font-semibold": hasError,
        })}
        data-error-path={path}
      >
        {hasError ? (
          <SimpleTooltip
            title={errors.map((error) => (
              <div key={error.message}>
                {error.path.join(".")}: {error.message}
              </div>
            ))}
            delayDuration={0}
          >
            <Slot className="bg-rose-200 text-rose-800 p-1 cursor-pointer hover:bg-rose-400 transition-colors rounded">
              {labelElement}
            </Slot>
          </SimpleTooltip>
        ) : (
          labelElement
        )}
        {errors?.map((error) => (
          <div
            key={error.message}
            className="text-red-500 text-sm font-thin m-2"
          >
            {makePathLocal(error.path.join("."), path)}: {error.message}
          </div>
        ))}
        {typeof value === "object" && value !== null
          ? renderTree(value, path)
          : JSON.stringify(value)}
      </div>
    );

    return hasError ? (
      <Slot className="border border-dotted border-rose-400 rounded-lg p-3">
        {element}
      </Slot>
    ) : (
      element
    );
  };

  return (
    <div className="font-mono text-sm text-gray-800">
      <Tooltip>
        <TooltipContent className="max-h-[300px] max-w-screen-2xl overflow-y-auto whitespace-pre">
          {JSON.stringify(zodError.issues, null, 2)}
        </TooltipContent>
        <TooltipTrigger>
          <button
            onClick={scrollToError}
            className="p-2 bg-rose-700 text-rose-100 text-lg border border-rose-900 rounded inline-block mb-2"
          >
            Data not valid
          </button>
        </TooltipTrigger>
      </Tooltip>

      {renderTree(json)}
    </div>
  );
};

function makePathLocal(path: string, basePath: string): string {
  if (path.startsWith(basePath)) {
    return path.slice(basePath.length);
  }
  return path;
}
