import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CommitStatusBadgeProps {
  id: number;
  isCommitted: boolean;
  entityType: "report" | "billing" | "cost";
  services: WithMutationService;
  className?: string;
}

export function CommitStatusBadge({
  id,
  isCommitted,
  entityType,
  services,
  className,
}: CommitStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCommit = async () => {
    setIsLoading(true);
    try {
      await services.mutationService.commit(entityType, id);
      toast.success(`${entityType} committed successfully`);
      setIsOpen(false);
    } catch (error) {
      console.error(`Error committing ${entityType}:`, error);
      toast.error(`Failed to commit ${entityType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUncommit = async () => {
    setIsLoading(true);
    try {
      await services.mutationService.undoCommit(entityType, id);
      toast.success(`${entityType} uncommitted successfully`);
      setIsOpen(false);
    } catch (error) {
      console.error(`Error uncommitting ${entityType}:`, error);
      toast.error(`Failed to uncommit ${entityType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isCommitted ? "text-slate-300" : "text-green-500"
          } ${className || ""}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {isCommitted ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <PopoverHeader>
            {isCommitted ? "Uncommit" : "Commit"} {entityName}
          </PopoverHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isCommitted
                ? `This ${entityType} is currently committed and cannot be modified or deleted. Uncommitting will allow changes.`
                : `Committing this ${entityType} will prevent future updates and deletes. This action can be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant={isCommitted ? "outline" : "default"}
                size="sm"
                onClick={isCommitted ? handleUncommit : handleCommit}
                disabled={isLoading}
              >
                {isLoading
                  ? isCommitted
                    ? "Uncommitting..."
                    : "Committing..."
                  : isCommitted
                    ? "Uncommit"
                    : "Commit"}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
