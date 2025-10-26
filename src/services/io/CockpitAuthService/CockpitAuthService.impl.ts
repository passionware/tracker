import { create } from "zustand";
import { RemoteData, maybe, rd } from "@passionware/monads";
import { CockpitAuthService, CockpitAuthInfo } from "./CockpitAuthService";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { delay } from "@passionware/platform-js";

export function createCockpitAuthService(
  client: SupabaseClient,
): CockpitAuthService {
  const useAuth = create<RemoteData<CockpitAuthInfo>>(rd.ofIdle);

  // Initialize the Supabase client for OAuth handling
  console.log("CockpitAuthService: Initializing Supabase client");
  console.log("CockpitAuthService: Environment variables", {
    VITE_APP_COCKPIT_DB_SCHEMA: import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA,
    VITE_CLIENT_COCKPIT_SUPABASE_URL: import.meta.env
      .VITE_CLIENT_COCKPIT_SUPABASE_URL,
  });

  function getUserData(user: User, tenantId?: string): CockpitAuthInfo {
    return {
      id: user.id,
      displayName: user.user_metadata?.full_name || user.email || "",
      avatarUrl: maybe.of(user.user_metadata?.avatar_url),
      email: maybe.of(user.email),
      tenantId: maybe.of(tenantId),
    };
  }

  async function fetchUserTenantData(userId: string) {
    try {
      console.log("CockpitAuthService: Fetching user tenant data", { userId });
      console.log("CockpitAuthService: Client object", client);
      console.log(
        "CockpitAuthService: Client URL",
        (client as any).supabaseUrl,
      );

      const { data: userData, error } = await client
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      console.log("CockpitAuthService: User tenant query result", {
        userData,
        error,
      });

      if (error || !userData) {
        console.error("CockpitAuthService: User not found in tenant system", {
          error,
          userData,
        });
        return { error: new Error("User not found in tenant system") };
      }

      console.log("CockpitAuthService: User tenant data retrieved", {
        tenantId: userData.tenant_id,
      });
      return { tenantId: userData.tenant_id };
    } catch (err) {
      console.error("CockpitAuthService: Failed to fetch user tenant", err);
      return { error: new Error("Failed to fetch user tenant") };
    }
  }

  async function init() {
    console.log("CockpitAuthService: Starting init");

    // 1. Pobieramy aktualną sesję
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    console.log("CockpitAuthService: getSession result", {
      session: !!session,
      error: sessionError,
    });

    if (sessionError) {
      console.error("CockpitAuthService: Session error", sessionError);
      useAuth.setState(rd.ofError(sessionError));
      return;
    }
    if (!session) {
      console.log("CockpitAuthService: No session found");
      useAuth.setState(rd.ofError(new Error("No session")));
      return;
    }

    console.log("CockpitAuthService: User authenticated", {
      userId: session.user.id,
    });

    const result = await fetchUserTenantData(session.user.id);
    if (result.error) {
      useAuth.setState(rd.ofError(result.error));
      return;
    }
    useAuth.setState(rd.of(getUserData(session.user, result.tenantId)));

    ////

    client.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("CockpitAuthService: Auth state change", {
        event,
        hasSession: !!currentSession,
      });

      switch (event) {
        case "SIGNED_IN":
          console.log("CockpitAuthService: User signed in");
          if (currentSession) {
            console.log("CockpitAuthService: Setting authenticated state", {
              userId: currentSession.user.id,
            });
            const result = await fetchUserTenantData(currentSession.user.id);
            if (result.error) {
              useAuth.setState(rd.ofError(result.error));
              return;
            }
            useAuth.setState(
              rd.of(getUserData(currentSession.user, result.tenantId)),
            );
          } else {
            console.error("CockpitAuthService: SIGNED_IN without session");
            useAuth.setState(
              rd.ofError(new Error("SIGNED_IN without session")),
            );
          }
          break;

        case "SIGNED_OUT":
          console.log("CockpitAuthService: User signed out");
          useAuth.setState(rd.ofError(new Error("SIGNED_OUT")));
          break;

        case "TOKEN_REFRESHED":
          console.log("CockpitAuthService: Token refreshed");
          if (currentSession) {
            console.log(
              "CockpitAuthService: Updating state with refreshed token",
              {
                userId: currentSession.user.id,
              },
            );
            const result = await fetchUserTenantData(currentSession.user.id);
            if (result.error) {
              useAuth.setState(rd.ofError(result.error));
              return;
            }
            useAuth.setState(
              rd.of(getUserData(currentSession.user, result.tenantId)),
            );
          } else {
            console.error(
              "CockpitAuthService: TOKEN_REFRESHED without session",
            );
            useAuth.setState(
              rd.ofError(new Error("TOKEN_REFRESHED without session")),
            );
          }
          break;

        case "INITIAL_SESSION":
          console.log("CockpitAuthService: Initial session detected");
          if (currentSession) {
            console.log(
              "CockpitAuthService: Setting initial authenticated state",
              {
                userId: currentSession.user.id,
              },
            );
            useAuth.setState(rd.of(getUserData(currentSession.user)));
          } else {
            console.error(
              "CockpitAuthService: INITIAL_SESSION without session",
            );
            useAuth.setState(
              rd.ofError(new Error("INITIAL_SESSION without session")),
            );
          }
          break;

        default:
          console.log("CockpitAuthService: Unhandled auth event", { event });
          break;
      }
    });
  }
  init();

  return {
    useAuth,
    loginWithGoogle: async () => {
      console.log("CockpitAuthService: Starting Google OAuth login");
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback/cockpit`,
        },
      });
      if (error) {
        console.error("CockpitAuthService: Google OAuth error", error);
        throw error;
      }
      console.log("CockpitAuthService: Google OAuth initiated, redirecting...");
    },
    loginWithEmail: async ({ email, password }) => {
      console.log("CockpitAuthService: Starting email login", { email });
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error("CockpitAuthService: Email login error", error);
        throw error;
      }
      console.log("CockpitAuthService: Email login successful");
    },
    logout: async () => {
      console.log("CockpitAuthService: Starting logout");
      await client.auth.signOut();
      console.log("CockpitAuthService: Logout successful");
      useAuth.setState(rd.ofError(new Error("Logged out")));
    },
  };
}
