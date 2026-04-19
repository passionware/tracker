import type { Activity, ActivityQuery } from "@/api/activity/activity.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface ActivityService {
  getActivities: (query: ActivityQuery) => Promise<Activity[]>;
  useActivities: (query: ActivityQuery) => RemoteData<Activity[]>;
  useActivity: (activityId: Maybe<string>) => RemoteData<Activity | null>;
}

export interface WithActivityService {
  activityService: ActivityService;
}
