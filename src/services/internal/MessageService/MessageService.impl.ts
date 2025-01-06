import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { createRequestCollectMessaging } from "@passionware/platform-js";

export function createMessageService(): MessageService {
  return {
    reportSystemEffect: createRequestCollectMessaging(),
  };
}
