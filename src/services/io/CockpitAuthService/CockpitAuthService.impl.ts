import { create } from "zustand";
import { RemoteData, maybe, rd } from "@passionware/monads";
import { CockpitAuthService, CockpitAuthInfo } from "./CockpitAuthService";
import { SupabaseClient, User } from "@supabase/supabase-js";

export function createCockpitAuthService(
  client: SupabaseClient,
): CockpitAuthService {
  const useAuth = create<RemoteData<CockpitAuthInfo>>(rd.ofIdle);

  // Initialize the Supabase client for OAuth handling
  console.log("CockpitAuthService: Initializing Supabase client");

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
      const { data: userData, error } = await client
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      if (error || !userData) {
        return { error: new Error("User not found in tenant system") };
      }

      return { tenantId: userData.tenant_id };
    } catch (err) {
      return { error: new Error("Failed to fetch user tenant") };
    }
  }

  async function init() {
    console.log("CockpitAuthService: Starting init");

    let session, sessionError;

    try {
      // Add a timeout to detect if getSession hangs
      const sessionPromise = client.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("getSession timeout after 10 seconds")),
          10000,
        ),
      );

      const result = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as any;
      session = result.data?.session;
      sessionError = result.error;

      console.log("CockpitAuthService: getSession result", {
        session: !!session,
        error: sessionError,
      });
    } catch (timeoutError) {
      console.error(
        "CockpitAuthService: getSession timeout or error",
        timeoutError,
      );
      useAuth.setState(rd.ofError(timeoutError as Error));
      return;
    }

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

    const result = await fetchUserTenantData(session.user.id);
    if (result.error) {
      useAuth.setState(rd.ofError(result.error));
      return;
    }
    useAuth.setState(rd.of(getUserData(session.user, result.tenantId)));
  }
  init();

  client.auth.onAuthStateChange(async (event, currentSession) => {
    switch (event) {
      case "SIGNED_IN":
        if (currentSession) {
          const result = await fetchUserTenantData(currentSession.user.id);
          if (result.error) {
            useAuth.setState(rd.ofError(result.error));
            return;
          }
          useAuth.setState(
            rd.of(getUserData(currentSession.user, result.tenantId)),
          );
        } else {
          useAuth.setState(rd.ofError(new Error("SIGNED_IN without session")));
        }
        break;

      case "SIGNED_OUT":
        useAuth.setState(rd.ofError(new Error("SIGNED_OUT")));
        break;

      case "TOKEN_REFRESHED":
        if (currentSession) {
          const result = await fetchUserTenantData(currentSession.user.id);
          if (result.error) {
            useAuth.setState(rd.ofError(result.error));
            return;
          }
          useAuth.setState(
            rd.of(getUserData(currentSession.user, result.tenantId)),
          );
        } else {
          useAuth.setState(
            rd.ofError(new Error("TOKEN_REFRESHED without session")),
          );
        }
        break;

      default:
        break;
    }
  });

  return {
    useAuth,
    loginWithGoogle: async () => {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback/cockpit`,
        },
      });
      if (error) {
        throw error;
      }
    },
    loginWithEmail: async ({ email, password }) => {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
    },
    logout: async () => {
      await client.auth.signOut();
      useAuth.setState(rd.ofError(new Error("Logged out")));
    },
  };
}
