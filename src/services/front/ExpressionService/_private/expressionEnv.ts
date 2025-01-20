import * as _ from "lodash";
import * as dateFns from "date-fns";

export const expressionEnv = {
  _,
  dateFns,
  openWindow: (url: string) => window.open(url, "_blank"),
  fetch: window.fetch.bind(window),
};
