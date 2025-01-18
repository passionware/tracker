import {
  SimpleTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { Slot } from "@radix-ui/react-slot";
import React from "react";
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
  const issuesByPath: IssuesByPath =
    zodError.issues.reduce<IssuesByPath>((acc, issue) => {
      const path = issue.path.join(".");
      const parentPath = issue.path.slice(0, -1).join(".");

      if (!acc[path]) acc[path] = [];
      acc[path].push(issue);

      if (!acc[parentPath]) acc[parentPath] = [];
      acc[parentPath].push(issue);

      return acc;
    }, {}) || {};

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
                  {renderNode(item, itemPath)}
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
      return renderNode(data, path);
    }
  };

  const renderNode = (
    value: unknown,
    path: string,
    label: string | null = null,
  ): React.ReactNode => {
    const errors = issuesByPath[path];
    const hasError = Boolean(errors);
    const element = (
      <div
        className={cn("inline-block p-1", {
          "text-red-500 font-semibold": hasError,
        })}
        data-error-path={path}
      >
        {label && <span className="text-blue-500">{label}: </span>}
        {typeof value === "object" && value !== null
          ? Array.isArray(value)
            ? renderTree(value, path)
            : renderTree(value, path)
          : JSON.stringify(value)}
      </div>
    );

    return hasError ? (
      <SimpleTooltip
        title={errors.map((error) => (
          <div>
            {error.path.join(".")}: {error.message}
          </div>
        ))}
      >
        <Slot className="border border-dotted border-rose-400 rounded-lg p-3">{element}</Slot>
      </SimpleTooltip>
    ) : (
      element
    );
  };

  return (
    <div className="font-mono text-sm text-gray-800">
      <Tooltip>
        <TooltipContent className="max-h-[300px] max-w-screen-2xl overflow-y-auto whitespace-pre">
          {JSON.stringify(zodError.issues, null, 2)}
          {/*{zodError.errors.map((x) => x.path).join("\n")}*/}
        </TooltipContent>
        <TooltipTrigger>
          <div className="p-2 bg-rose-700 text-rose-100 text-lg border border-rose-900 rounded inline-block mb-2">
            Data not valid
          </div>
        </TooltipTrigger>
      </Tooltip>

      {renderTree(json)}
    </div>
  );
};
