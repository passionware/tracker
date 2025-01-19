import { SystemEffectMessage } from "@/messages/SystemEffectMessage.ts";
import { VariableEditMessage } from "@/messages/VariableEditMessage.ts";
import { Messaging } from "@passionware/messaging-react";
import { CollectResponseMessaging } from "@passionware/platform-js";

export interface MessageService {
  reportSystemEffect: CollectResponseMessaging<SystemEffectMessage>;
  editVariable: Messaging<VariableEditMessage>;
}

export interface WithMessageService {
  messageService: MessageService;
}
