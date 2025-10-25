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
    let isProcessing = false;

    const handleAuthCallback = async () => {
      if (isProcessing) {
        console.log("CockpitAuthCallback: Already processing, skipping");
        return;
      }
      isProcessing = true;

      try {
        console.log("CockpitAuthCallback: Processing OAuth callback");

        // Check if there's a code in the URL that needs to be processed
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          console.error("CockpitAuthCallback: OAuth error in URL", error);
          navigate("/c/login?error=oauth_error");
          return;
        }

        if (code) {
          console.log("CockpitAuthCallback: Processing OAuth code", code);
          // Exchange the code for a session
          const { data, error: exchangeError } =
            await clientCockpitSupabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "CockpitAuthCallback: Code exchange error",
              exchangeError,
            );
            navigate("/c/login?error=exchange_error");
            return;
          }

          console.log("CockpitAuthCallback: Code exchange successful", data);

          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );

          if (data.session) {
            console.log(
              "CockpitAuthCallback: OAuth successful, redirecting to cockpit",
            );
            navigate("/c");
            return;
          }
        }

        // Fallback: try to get existing session
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
          );
          navigate("/c");
        } else {
          console.log(
            "CockpitAuthCallback: No session found, redirecting to cockpit login",
          );
          navigate("/c/login");
        }
      } catch (err) {
        console.error("CockpitAuthCallback: Callback error", err);
        navigate("/c/login?error=callback_error");
      }
    };

    handleAuthCallback();
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
