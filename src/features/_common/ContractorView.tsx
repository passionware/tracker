import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import { cva, VariantProps } from "class-variance-authority";
import { CircleSlash, TriangleAlert } from "lucide-react";

export interface ContractorViewProps
  extends VariantProps<typeof contractorViewVariants> {
  contractor: RemoteData<Contractor>;
  layout?: "full" | "avatar";
  className?: string;
}

const contractorViewVariants = cva("border border-slate-950/10", {
  variants: {
    size: {
      xs: "size-4 text-[6pt]",
      sm: "size-6 text-[8pt]",
      md: "size-8",
      lg: "size-12",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function ContractorView({
  contractor,
  layout,
  size,
  className,
}: ContractorViewProps) {
  const avatar = (
    <Avatar className={cn(contractorViewVariants({ size }), className)}>
      {rd
        .fullJourney(contractor)
        .initially(
          <SimpleTooltip title="No contractor">
            <CircleSlash className="w-full h-full text-slate-400" />
          </SimpleTooltip>,
        )
        .wait(<Skeleton className="size-8 rounded-full" />)
        .catch(() => (
          <AvatarFallback>
            <TriangleAlert />
          </AvatarFallback>
        ))
        .map((contractor) => (
          <>
            {/*{contractor./!*avatarUrl && (*/}
            {/*  <AvatarImage src={contractor.avatarUrl} alt={contractor.name} />*/}
            {/*)}*!/*/}
            <AvatarFallback>{getInitials(contractor.fullName)}</AvatarFallback>
          </>
        ))}
    </Avatar>
  );

  if (layout === "avatar") {
    return (
      <SimpleTooltip title={rd.tryGet(contractor)?.fullName}>
        {avatar}
      </SimpleTooltip>
    );
  }

  return (
    <div className="flex items-center flex-row gap-2 text-xs whitespace-pre">
      {avatar}
      {rd
        .fullJourney(contractor)
        .initially("No contractor")
        .wait(<Skeleton className="w-20" />)
        .catch(() => "error")
        .map((contractor) => contractor.name)}
    </div>
  );
}

export type ContractorWidgetProps = Omit<ContractorViewProps, "contractor"> &
  WithServices<[WithContractorService]> & {
    contractorId: Maybe<number>;
  };

export function ContractorWidget({
  contractorId,
  ...props
}: ContractorWidgetProps) {
  const contractor =
    props.services.contractorService.useContractor(contractorId);
  return <ContractorView contractor={contractor} {...props} />;
}
