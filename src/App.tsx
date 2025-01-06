import {
  myServices,
  NavigationServiceInject,
} from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={0}>
        <NavigationServiceInject />
        <RootWidget services={myServices} />
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
