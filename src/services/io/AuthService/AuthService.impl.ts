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
    console.log("AuthService: Starting init");

    // 1. Pobieramy aktualną sesję
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    console.log("AuthService: getSession result", {
      session: !!session,
      error,
    });

    if (error) {
      console.error("AuthService: Session error", error);
      useAuth.setState(rd.ofError(error));
      return;
    }
    if (!session) {
      console.log("AuthService: No session found");
      useAuth.setState(rd.ofError(new Error("No session")));
      return;
    }

    console.log("AuthService: User authenticated", { userId: session.user.id });
    useAuth.setState(rd.of(getUserData(session.user)));

    //

    client.auth.onAuthStateChange((event, currentSession) => {
      console.log("AuthService: Auth state change", {
        event,
        hasSession: !!currentSession,
      });

      switch (event) {
        case "SIGNED_IN":
          console.log("AuthService: User signed in");
          if (currentSession) {
            console.log("AuthService: Setting authenticated state", {
              userId: currentSession.user.id,
            });
            useAuth.setState(rd.of(getUserData(currentSession.user)));
          } else {
            console.error("AuthService: SIGNED_IN without session");
            useAuth.setState(
              rd.ofError(new Error("SIGNED_IN without session")),
            );
          }
          break;

        case "SIGNED_OUT":
          console.log("AuthService: User signed out");
          useAuth.setState(rd.ofError(new Error("SIGNED_OUT")));
          break;

        case "TOKEN_REFRESHED":
          console.log("AuthService: Token refreshed");
          if (currentSession) {
            console.log("AuthService: Updating state with refreshed token", {
              userId: currentSession.user.id,
            });
            useAuth.setState(rd.of(getUserData(currentSession.user)));
          } else {
            console.error("AuthService: TOKEN_REFRESHED without session");
            useAuth.setState(
              rd.ofError(new Error("TOKEN_REFRESHED without session")),
            );
          }
          break;

        case "INITIAL_SESSION":
          console.log("AuthService: Initial session detected");
          if (currentSession) {
            console.log("AuthService: Setting initial authenticated state", {
              userId: currentSession.user.id,
            });
            useAuth.setState(rd.of(getUserData(currentSession.user)));
          } else {
            console.error("AuthService: INITIAL_SESSION without session");
            useAuth.setState(
              rd.ofError(new Error("INITIAL_SESSION without session")),
            );
          }
          break;

        default:
          console.log("AuthService: Unhandled auth event", { event });
          break;
      }
    });
  }
  init();

  return {
    useAuth,
    loginWithGoogle: async () => {
      console.log("AuthService: Starting Google OAuth login");
      await promiseState.syncRemoteData(useAuth.setState).track(
        (async () => {
          const { error } = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback/primary`,
            },
          });
          if (error) {
            console.error("AuthService: Google OAuth error", error);
            throw error;
          }
          console.log("AuthService: Google OAuth initiated, redirecting...");
          {
            const { error, data } = await client.auth.getSession();
            if (error) {
              console.error("AuthService: Session error after OAuth", error);
              throw error;
            }
            if (!data?.session) {
              console.error("AuthService: No session after OAuth");
              throw new Error("No session");
            }
            console.log("AuthService: OAuth successful", {
              userId: data.session.user.id,
            });
            return getUserData(data.session.user);
          }
        })(),
      );
    },
    loginWithEmail: async ({ email, password }) => {
      console.log("AuthService: Starting email login", { email });
      await promiseState.syncRemoteData(useAuth.setState).track(
        (async () => {
          const { error } = await client.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            console.error("AuthService: Email login error", error);
            throw error;
          }
          console.log(
            "AuthService: Email login successful, getting session...",
          );
          {
            const { error, data } = await client.auth.getSession();
            if (error) {
              console.error(
                "AuthService: Session error after email login",
                error,
              );
              throw error;
            }
            if (!data?.session) {
              console.error("AuthService: No session after email login");
              throw new Error("No session");
            }
            console.log("AuthService: Email login successful", {
              userId: data.session.user.id,
            });
            return getUserData(data.session.user);
          }
        })(),
      );
      rd.getOrThrow(useAuth.getState());
    },
    logout: async () => {
      console.log("AuthService: Starting logout");
      await client.auth.signOut();
      console.log("AuthService: Logout successful");
      useAuth.setState(rd.ofError(new Error("Logged out")));
    },
  };
}
