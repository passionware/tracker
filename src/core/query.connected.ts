import { QueryClient } from "@tanstack/react-query";

export const myQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
