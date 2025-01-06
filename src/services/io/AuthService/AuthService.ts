import { Maybe, RemoteData } from "@passionware/monads";

export interface AuthInfo {
  id: string;
  displayName: string;
  avatarUrl: Maybe<string>;
  email: Maybe<string>;
}

export interface AuthService {
  useAuth: () => RemoteData<AuthInfo>;
  loginWithGoogle: () => void;
  loginWithEmail: (options: {
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

export interface WithAuthService {
  authService: AuthService;
}
