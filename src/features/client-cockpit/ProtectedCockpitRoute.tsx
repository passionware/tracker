import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, LogIn } from "lucide-react";

interface ProtectedCockpitRouteProps extends WithFrontServices {
  children: React.ReactNode;
}

export function ProtectedCockpitRoute({
  children,
  services,
}: PropsWithChildren<ProtectedCockpitRouteProps>) {
  const authState = services.cockpitAuthService.useAuth();

  return rd
    .journey(authState)
    .wait(
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Loading your cockpit...</p>
        </div>
      </div>,
    )
    .catch(() => (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldAlert className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription className="text-base">
              You need to sign in to access the Client Cockpit
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Access to cube reports and analytics requires authentication
              </p>
            </div>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              size="lg"
            >
              <Link to={services.routingService.forClientCockpit().login()}>
                <LogIn className="h-5 w-5 mr-2" />
                Sign In to Cockpit
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    ))
    .map(() => children);
}
