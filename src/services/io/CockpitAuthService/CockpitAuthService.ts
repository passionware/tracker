import { Maybe, RemoteData } from "@passionware/monads";

export interface CockpitAuthInfo {
  id: string;
  displayName: string;
  avatarUrl: Maybe<string>;
  email: Maybe<string>;
  tenantId: Maybe<string>;
}

export interface CockpitAuthService {
  useAuth: () => RemoteData<CockpitAuthInfo>;
  loginWithGoogle: () => void;
  loginWithEmail: (options: {
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

export interface WithCockpitAuthService {
  cockpitAuthService: CockpitAuthService;
}
