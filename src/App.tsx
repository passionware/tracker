import { myServices } from "@/core/services.connected.ts";
import { RootWidget } from "@/features/app/RootWidget.tsx";

function App() {
  return <RootWidget services={myServices} />;
}

export default App;
