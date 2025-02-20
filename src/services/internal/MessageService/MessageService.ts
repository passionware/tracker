import { BillingEditMessage } from "@/messages/BillingEditMessage.ts";
import { CostEditMessage } from "@/messages/CostEditMessage.ts";
import { ProjectIterationPositionEditMessage } from "@/messages/ProjectIterationPositionEditMessage.ts";
import { ReportEditMessage } from "@/messages/ReportEditMessage.ts";
import { SystemEffectMessage } from "@/messages/SystemEffectMessage.ts";
import { VariableEditMessage } from "@/messages/VariableEditMessage.ts";
import { Messaging } from "@passionware/messaging-react";
import { CollectResponseMessaging } from "@passionware/platform-js";

export interface MessageService {
  reportSystemEffect: CollectResponseMessaging<SystemEffectMessage>;
  editVariable: Messaging<VariableEditMessage>;
  editReport: Messaging<ReportEditMessage>;
  editCost: Messaging<CostEditMessage>;
  editBilling: Messaging<BillingEditMessage>;
  editProjectIterationPosition: Messaging<ProjectIterationPositionEditMessage>;
}

export interface WithMessageService {
  messageService: MessageService;
}
