export interface SystemEffectMessage {
  request: {
    scope: unknown; // todo for future optimization
  };
  response: void;
}
