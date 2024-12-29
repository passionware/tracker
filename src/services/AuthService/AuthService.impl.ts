import { AuthInfo, AuthService } from "@/services/AuthService/AuthService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";

export function createAuthService(client: SupabaseClient): AuthService {
  const useAuth = create<RemoteData<AuthInfo>>(rd.ofIdle);

  async function init() {
    // 1. Pobieramy aktualną sesję
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      useAuth.setState(rd.ofError(error));
      return;
    }
    if (!session) {
      useAuth.setState(rd.ofError(new Error("No session")));
      return;
    }
    useAuth.setState(rd.of({}));
  }
  init();
  client.auth.onAuthStateChange((event, currentSession) => {
    switch (event) {
      case "SIGNED_IN":
        // Użytkownik się zalogował
        if (currentSession) {
          useAuth.setState(
            rd.of({
              user: currentSession.user,
              session: currentSession,
            }),
          );
        } else {
          // To się rzadko zdarza, ale możesz obsłużyć sytuację braku session
          useAuth.setState(rd.ofError(new Error("SIGNED_IN without session")));
        }
        break;

      case "SIGNED_OUT":
        // Użytkownik się wylogował
        // Możesz ustawić rd.ofIdle lub rd.ofError, w zależności od tego,
        // jak chcesz traktować ten stan.
        useAuth.setState(rd.ofError(new Error("SIGNED_OUT")));
        break;

      case "TOKEN_REFRESHED":
        // Token został odświeżony
        if (currentSession) {
          useAuth.setState(
            rd.of({
              user: currentSession.user, // todo decide if we need to update user
              session: currentSession,
            }),
          );
        } else {
          // Podobnie jak wyżej – raczej rzadki edge case.
          useAuth.setState(
            rd.ofError(new Error("TOKEN_REFRESHED without session")),
          );
        }
        break;

      // Obsługa innych eventów (opcjonalnie):
      // "USER_UPDATED", "PASSWORD_RECOVERY", itp.
      default:
        break;
    }
  });

  return {
    useAuth,
  };
}
