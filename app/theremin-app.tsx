"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const modes = [
  { id: "face", label: "Visage", shortLabel: "Visage" },
  { id: "face-duo", label: "Visage Duo", shortLabel: "Duo" },
  { id: "hands", label: "Mains", shortLabel: "Mains" },
  { id: "hands-duo", label: "Mains Duo", shortLabel: "Duo mains" },
  { id: "continuous", label: "Continu", shortLabel: "Continu" },
] as const;

type ModeId = (typeof modes)[number]["id"];

type MIDIMessage = {
  kind: "note" | "frequency";
  channel: number;
  active: boolean;
  note?: number;
  frequency?: number;
  velocity: number;
  expression: number;
};

type ChannelState = {
  note: number | null;
  expression: number;
};

const clamp7 = (value: number) =>
  Math.max(0, Math.min(127, Math.round(value)));

export function ThereminApp() {
  const [mode, setMode] = useState<ModeId>("face");
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
  const [outputId, setOutputId] = useState("");
  const [midiStatus, setMidiStatus] = useState("MIDI non connecté");
  const outputRef = useRef<MIDIOutput | null>(null);
  const channelsRef = useRef<ChannelState[]>(
    Array.from({ length: 16 }, () => ({ note: null, expression: -1 })),
  );
  const selected = modes.find((item) => item.id === mode) ?? modes[0];

  const allNotesOff = useCallback(() => {
    const output = outputRef.current;
    if (!output) return;
    channelsRef.current.forEach((state, channel) => {
      if (state.note !== null) {
        output.send([0x80 | channel, state.note, 0]);
      }
      output.send([0xb0 | channel, 11, 0]);
      output.send([0xb0 | channel, 123, 0]);
      output.send([0xe0 | channel, 0, 64]);
      state.note = null;
      state.expression = -1;
    });
  }, []);

  const refreshOutputs = useCallback((access: MIDIAccess) => {
    const nextOutputs = Array.from(access.outputs.values()).filter(
      (output) => output.state !== "disconnected",
    );
    setOutputs(nextOutputs);
    setOutputId((current) => {
      if (nextOutputs.some((output) => output.id === current)) return current;
      return nextOutputs[0]?.id ?? "";
    });
    setMidiStatus(
      nextOutputs.length > 0 ? "MIDI prêt" : "Aucune sortie MIDI détectée",
    );
  }, []);

  const connectMIDI = useCallback(async () => {
    if (typeof navigator.requestMIDIAccess !== "function") {
      setMidiStatus("MIDI indisponible sur ce navigateur");
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      setMidiAccess(access);
      refreshOutputs(access);
      access.onstatechange = () => refreshOutputs(access);
    } catch {
      setMidiStatus("Autorisation MIDI refusée");
    }
  }, [refreshOutputs]);

  useEffect(() => {
    allNotesOff();
    outputRef.current =
      outputs.find((output) => output.id === outputId) ?? null;
    if (outputRef.current) setMidiStatus("MIDI prêt");
  }, [allNotesOff, outputId, outputs]);

  useEffect(() => {
    allNotesOff();
  }, [allNotesOff, mode]);

  useEffect(() => {
    const handleMIDI = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "seb-midi") return;

      const output = outputRef.current;
      if (!output) return;

      const message = event.data.payload as MIDIMessage;
      const channel = Math.max(0, Math.min(15, message.channel | 0));
      const state = channelsRef.current[channel];
      let note = message.note ?? 0;
      let pitchBend = 8192;

      if (message.kind === "frequency" && message.active && message.frequency) {
        const preciseNote = 69 + 12 * Math.log2(message.frequency / 440);
        note = Math.max(0, Math.min(127, Math.round(preciseNote)));
        pitchBend = Math.max(
          0,
          Math.min(16383, Math.round(8192 + ((preciseNote - note) / 2) * 8192)),
        );
      }

      if (!message.active) {
        if (state.note !== null) {
          output.send([0x80 | channel, state.note, 0]);
        }
        output.send([0xb0 | channel, 11, 0]);
        output.send([0xe0 | channel, 0, 64]);
        state.note = null;
        state.expression = -1;
        return;
      }

      const expression = clamp7(message.expression * 127);
      if (expression !== state.expression) {
        output.send([0xb0 | channel, 11, expression]);
        state.expression = expression;
      }

      output.send([
        0xe0 | channel,
        pitchBend & 0x7f,
        (pitchBend >> 7) & 0x7f,
      ]);

      if (state.note !== note) {
        if (state.note !== null) {
          output.send([0x80 | channel, state.note, 0]);
        }
        output.send([0x90 | channel, note, clamp7(message.velocity * 127)]);
        state.note = note;
      }
    };

    window.addEventListener("message", handleMIDI);
    return () => window.removeEventListener("message", handleMIDI);
  }, []);

  useEffect(
    () => () => {
      allNotesOff();
      if (midiAccess) midiAccess.onstatechange = null;
    },
    [allNotesOff, midiAccess],
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <p className="eyebrow">Contrôleur MIDI gestuel</p>
            <h1>SEB WebThérémine</h1>
          </div>
        </div>

        <nav className="mode-switcher" aria-label="Choisir un mode de jeu">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? "mode-button active" : "mode-button"}
              aria-pressed={item.id === mode}
              onClick={() => setMode(item.id)}
            >
              <span className="wide-label">{item.label}</span>
              <span className="short-label">{item.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="midi-controls">
          {outputs.length > 0 ? (
            <select
              value={outputId}
              onChange={(event) => setOutputId(event.target.value)}
              aria-label="Sortie MIDI"
            >
              {outputs.map((output) => (
                <option key={output.id} value={output.id}>
                  {output.name || output.manufacturer || "Sortie MIDI"}
                </option>
              ))}
            </select>
          ) : (
            <button type="button" className="midi-button" onClick={connectMIDI}>
              Connecter MIDI
            </button>
          )}
          <span className="midi-status">
            <i aria-hidden="true" />
            {midiStatus}
          </span>
        </div>
      </header>

      <section className="instrument-frame" aria-label={`Mode ${selected.label}`}>
        <iframe
          key={mode}
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/modes/${mode}/index.html`}
          title={`SEB WebThérémine — ${selected.label}`}
          allow="camera; fullscreen"
        />
      </section>
    </main>
  );
}
