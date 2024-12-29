import { RemoteData } from "@passionware/monads";

export interface AuthInfo {}

export interface AuthService {
  useAuth: () => RemoteData<AuthInfo>;
}

export interface WithAuthService {
  authService: AuthService;
}
