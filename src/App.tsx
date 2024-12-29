import { myServices } from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";
import { BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <RootWidget services={myServices} />
    </BrowserRouter>
  );
}

export default App;
