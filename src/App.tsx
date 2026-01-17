import {
  myServices,
  NavigationServiceInject,
} from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
import { DialogServiceHandler } from "./services/front/DialogService/DialogService.impl.connected";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={0}>
        <NavigationServiceInject />
        <DialogServiceHandler />
        <RootWidget services={myServices} />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
