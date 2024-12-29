import { AuthInfo, AuthService } from "@/services/AuthService/AuthService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";

export function createAuthService(client: SupabaseClient): AuthService {
  const useAuth = create<RemoteData<AuthInfo>>(rd.ofIdle);

  promiseState.syncRemoteData(useAuth.setState).track(client.auth.getSession());

  return {
    useAuth,
  };
}
