import {
  myServices,
  NavigationServiceInject,
} from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";
import { BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <NavigationServiceInject />
      <RootWidget services={myServices} />
    </BrowserRouter>
  );
}

export default App;
