import {
  AuthInfo,
  AuthService,
} from "@/services/io/AuthService/AuthService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { create } from "zustand";

export function createAuthService(client: SupabaseClient): AuthService {
  const useAuth = create<RemoteData<AuthInfo>>(rd.ofIdle);

  function getUserData(user: User) {
    // Bezpośrednio z obiektu user:
    const email = user.email;

    function extractNickFromEmail(email: string): string {
      return email.split("@")[0];
    }

    // Z metadanych:
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      extractNickFromEmail(user.email ?? "") ||
      "";
    const avatarUrl = user.user_metadata?.avatar_url;
    const id = user.id;

    return { id, email, displayName, avatarUrl };
  }

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
    useAuth.setState(rd.of(getUserData(session.user)));
  }
  init();
  client.auth.onAuthStateChange((event, currentSession) => {
    switch (event) {
      case "SIGNED_IN":
        // Użytkownik się zalogował
        if (currentSession) {
          useAuth.setState(rd.of(getUserData(currentSession.user)));
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
          useAuth.setState(rd.of(getUserData(currentSession.user)));
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
    loginWithGoogle: async () => {
      await promiseState.syncRemoteData(useAuth.setState).track(
        (async () => {
          const { error } = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback/primary`,
            },
          });
          if (error) {
            throw error;
          }
          {
            const { error, data } = await client.auth.getSession();
            if (error) {
              throw error;
            }
            if (!data?.session) {
              throw new Error("No session");
            }
            return getUserData(data.session.user);
          }
        })(),
      );
    },
    loginWithEmail: async ({ email, password }) => {
      await promiseState.syncRemoteData(useAuth.setState).track(
        (async () => {
          const { error } = await client.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            throw error;
          }
          {
            const { error, data } = await client.auth.getSession();
            if (error) {
              throw error;
            }
            if (!data?.session) {
              throw new Error("No session");
            }
            return getUserData(data.session.user);
          }
        })(),
      );
      rd.getOrThrow(useAuth.getState());
    },
    logout: async () => {
      await client.auth.signOut();
      useAuth.setState(rd.ofError(new Error("Logged out")));
    },
  };
}
