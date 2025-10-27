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
    console.log("PrimaryAuthCallback: Starting callback handler");

    // With PKCE and detectSessionInUrl: true, Supabase automatically handles the code exchange
    // We just need to wait for it to complete and then check the session

    const checkSession = async () => {
      // Give Supabase a moment to process the URL and exchange the code
      await new Promise((resolve) => setTimeout(resolve, 100));

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
          { userId: session.user.id },
        );
        navigate("/");
      } else {
        console.log(
          "PrimaryAuthCallback: No session found, redirecting to login",
        );
        navigate("/login");
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
