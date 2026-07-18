import { useEffect } from "react";
import AircraftPanel from "./components/AircraftPanel";
import DetailCard from "./components/DetailCard";
import Map from "./components/Map";
import RadiusSearchControl from "./components/RadiusSearchControl";
import { connectAircraftSocket } from "./ws";

export default function App() {
  useEffect(() => {
    connectAircraftSocket();
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map />
      <AircraftPanel />
      <DetailCard />
      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <RadiusSearchControl />
      </div>
    </div>
  );
}
