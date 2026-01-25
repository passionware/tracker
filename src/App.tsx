import {
  myServices,
  NavigationServiceInject,
} from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";
import { unstable_HistoryRouter as HistoryRouter } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { DialogServiceHandler } from "./services/front/DialogService/DialogService.impl.connected";
import { TooltipProvider } from "./components/ui/tooltip";
import { createTrackerPersistentBrowserHistory } from "./services/internal/navigation/createPersistentBrowserHistory.connected";

const history = createTrackerPersistentBrowserHistory();

function App() {
  return (
    <HistoryRouter history={history as any}>
      <TooltipProvider delayDuration={0}>
        <NavigationServiceInject />
        <DialogServiceHandler />
        <RootWidget services={myServices} />
        <Toaster />
      </TooltipProvider>
    </HistoryRouter>
  );
}

export default App;
