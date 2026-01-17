import { Report } from "@/api/reports/reports.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WithFrontServices } from "@/core/frontServices";
import { DialogProps } from "@radix-ui/react-dialog";

export interface ReportGenerationWidgetProps
  extends WithFrontServices,
    DialogProps {
  reports: Report[];
}

export function ReportGenerationWidget({
  services,
  ...props
}: ReportGenerationWidgetProps) {
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Detailed Report</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
