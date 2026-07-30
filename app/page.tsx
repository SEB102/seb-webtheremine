import type { Metadata } from "next";
import { ThereminApp } from "./theremin-app";

export const metadata: Metadata = {
  title: "SEB WebThérémine",
  description:
    "Un contrôleur MIDI gestuel MediaPipe pour Mac et iPad.",
};

export default function Home() {
  return <ThereminApp />;
}
