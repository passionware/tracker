import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import {
  createRequestCollectMessaging,
  createRequestResponseMessaging,
} from "@passionware/messaging-react";

export function createMessageService(): MessageService {
  return {
    reportSystemEffect: createRequestCollectMessaging(),
    editVariable: createRequestResponseMessaging(),
    editBilling: createRequestResponseMessaging(),
    editCost: createRequestResponseMessaging(),
    editReport: createRequestResponseMessaging(),
  };
}
