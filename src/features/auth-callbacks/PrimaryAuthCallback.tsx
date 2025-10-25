import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mySupabase } from "@/core/supabase.connected.ts";

/**
 * Handles OAuth callback for the primary Supabase project
 * Route: /auth/callback/primary
 */
export function PrimaryAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isProcessing = false;

    const handleAuthCallback = async () => {
      if (isProcessing) {
        console.log("PrimaryAuthCallback: Already processing, skipping");
        return;
      }
      isProcessing = true;

      try {
        console.log("PrimaryAuthCallback: Processing OAuth callback");

        // Check if there's a code in the URL that needs to be processed
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          console.error("PrimaryAuthCallback: OAuth error in URL", error);
          navigate("/login?error=oauth_error");
          return;
        }

        if (code) {
          console.log("PrimaryAuthCallback: Processing OAuth code", code);
          // Exchange the code for a session
          const { data, error: exchangeError } =
            await mySupabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "PrimaryAuthCallback: Code exchange error",
              exchangeError,
            );
            navigate("/login?error=exchange_error");
            return;
          }

          console.log("PrimaryAuthCallback: Code exchange successful", data);

          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );

          if (data.session) {
            console.log(
              "PrimaryAuthCallback: OAuth successful, redirecting to main app",
            );
            navigate("/");
            return;
          }
        }

        // Fallback: try to get existing session
        const {
          data: { session },
          error: sessionError,
        } = await mySupabase.auth.getSession();

        if (sessionError) {
          console.error("PrimaryAuthCallback: Session error", sessionError);
          navigate("/login?error=session_error");
          return;
        }

        if (session) {
          console.log(
            "PrimaryAuthCallback: OAuth successful, redirecting to main app",
          );
          navigate("/");
        } else {
          console.log(
            "PrimaryAuthCallback: No session found, redirecting to login",
          );
          navigate("/login");
        }
      } catch (err) {
        console.error("PrimaryAuthCallback: Callback error", err);
        navigate("/login?error=callback_error");
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
