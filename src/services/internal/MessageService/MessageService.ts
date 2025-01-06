import { SystemEffectMessage } from "@/messages/SystemEffectMessage.ts";
import { CollectResponseMessaging } from "@passionware/platform-js";

export interface MessageService {
  reportSystemEffect: CollectResponseMessaging<SystemEffectMessage>;
}

export interface WithMessageService {
  messageService: MessageService;
}
