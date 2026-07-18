import { useEffect } from "react";
import Map from "./components/Map";
import StatusBar from "./components/StatusBar";
import { connectAircraftSocket } from "./ws";

export default function App() {
  useEffect(() => {
    connectAircraftSocket();
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map />
      <StatusBar />
    </div>
  );
}
