export interface PreferenceService {
  useIsDangerMode: () => boolean;
  getIsDangerMode: () => boolean;
  setIsDangerMode: (value: boolean) => void;
}

export interface WithPreferenceService {
  preferenceService: PreferenceService;
}
