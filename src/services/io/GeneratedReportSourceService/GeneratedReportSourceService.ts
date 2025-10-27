import {
  GeneratedReportSource,
  GeneratedReportSourceQuery,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface GeneratedReportSourceService {
  useGeneratedReportSources: (
    query: Maybe<GeneratedReportSourceQuery>,
  ) => RemoteData<GeneratedReportSource[]>;
  useGeneratedReportSource: (
    id: Maybe<GeneratedReportSource["id"]>,
  ) => RemoteData<GeneratedReportSource>;
}

export interface WithGeneratedReportSourceService {
  generatedReportSourceService: GeneratedReportSourceService;
}
