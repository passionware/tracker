import { Variable } from "@/api/variable/variable.api.ts";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { cn } from "@/lib/utils.ts";

const helper = getColumnHelper<Variable>();

export const variable = {
  name: helper.accessor("name", { header: "Name" }),
  value: helper.accessor("value", {
    header: "Value",
    cell: (info) => {
      const className = cn(
        "p-1 border",
        {
          const: "border-sky-800/50 rounded bg-sky-50 text-sky-800",
          expression: "border-lime-800/50 rounded bg-lime-50 text-lime-900",
        }[info.row.original.type],
      );
      return (
        <OverflowTooltip
          light
          title={
            <div className={cn(className, "whitespace-pre overflow-auto")}>
              {info.getValue()}
            </div>
          }
        >
          <div className={cn(className, "max-w-[10rem] w-min truncate")}>
            {info.getValue()}
          </div>
        </OverflowTooltip>
      );
    },
  }),
  type: helper.accessor("type", { header: "Type" }),
};
