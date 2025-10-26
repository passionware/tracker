import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clientCockpitSupabase } from "@/core/clientSupabase.connected.ts";

/**
 * Handles OAuth callback for the cockpit Supabase project
 * Route: /auth/callback/cockpit
 */
export function CockpitAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("CockpitAuthCallback: Starting callback handler");

    // With PKCE and detectSessionInUrl: true, Supabase automatically handles the code exchange
    // We just need to wait for it to complete and then check the session

    const checkSession = async () => {
      // Give Supabase a moment to process the URL and exchange the code
      await new Promise((resolve) => setTimeout(resolve, 100));

      const {
        data: { session },
        error: sessionError,
      } = await clientCockpitSupabase.auth.getSession();

      if (sessionError) {
        console.error("CockpitAuthCallback: Session error", sessionError);
        navigate("/c/login?error=session_error");
        return;
      }

      if (session) {
        console.log(
          "CockpitAuthCallback: OAuth successful, redirecting to cockpit",
          { userId: session.user.id },
        );
        navigate("/c");
      } else {
        console.log(
          "CockpitAuthCallback: No session found, redirecting to cockpit login",
        );
        navigate("/c/login");
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-700">Processing authentication...</p>
      </div>
    </div>
  );
}
