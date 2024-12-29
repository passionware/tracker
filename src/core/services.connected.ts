import { mySupabase } from "@/core/supabase.connected.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { createAuthService } from "@/services/AuthService/AuthService.impl.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";

export const myServices = {
  authService: createAuthService(mySupabase),
} satisfies MergeServices<[WithAuthService]>;
