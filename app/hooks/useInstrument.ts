import { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";

// Define available instruments and their sample configurations
// User will need to provide actual sample files in /public/samples/
// The keys here (e.g., 'piano', 'guitar') will be used in the UI selector.
// The 'urls' object maps note names (e.g., 'C4') to their sample file paths.
const INSTRUMENT_CONFIGS: Record<
  string,
  { name: string; urls: Record<string, string> }
> = {
  defaultSynth: {
    name: "Sintetizador",
    urls: {}, // Special case for the default synth, no samples needed
  },
  piano: {
    name: "Piano",
    // Example: User needs to add 'C4.mp3', 'G4.mp3' etc. to /public/samples/piano/
    urls: {
      G2: "piano/g2.mp3",
      C3: "piano/c3.mp3",
      G3: "piano/g3.mp3",
      C4: "piano/c4.mp3",
      G4: "piano/g4.mp3",
      C5: "piano/c5.mp3",
      G5: "piano/g5.mp3",
    },
  },
  guitar: {
    name: "Guitarra",
    // Example: User needs to add 'C4.mp3', 'G4.mp3' etc. to /public/samples/guitar/
    urls: {
      C2: "guitar/c2.mp3",
      G2: "guitar/g2.mp3",
      C3: "guitar/c3.mp3",
      G3: "guitar/g3.mp3",
      C4: "guitar/c4.mp3",
      G4: "guitar/g4.mp3",
      C5: "guitar/c5.mp3",
      G5: "guitar/g5.mp3",
    },
  },
  // Add more instruments here
};

export interface Instrument {
  id: string;
  name: string;
  sampler: Tone.Sampler | Tone.PolySynth | null;
  isLoaded: boolean;
}

const DEFAULT_INSTRUMENT_ID = "defaultSynth";

export function useInstrument() {
  const [instruments, setInstruments] = useState<Record<string, Instrument>>(
    {}
  );
  const [currentInstrumentId, setCurrentInstrumentId] = useState<string>(
    DEFAULT_INSTRUMENT_ID
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize instruments on mount
  useEffect(() => {
    const initialInstruments: Record<string, Instrument> = {};
    Object.keys(INSTRUMENT_CONFIGS).forEach((id) => {
      if (id === DEFAULT_INSTRUMENT_ID) {
        initialInstruments[id] = {
          id,
          name: INSTRUMENT_CONFIGS[id].name,
          sampler: new Tone.PolySynth(Tone.Synth).toDestination(), // Default synth
          isLoaded: true,
        };
      } else {
        initialInstruments[id] = {
          id,
          name: INSTRUMENT_CONFIGS[id].name,
          sampler: null,
          isLoaded: false,
        };
      }
    });
    setInstruments(initialInstruments);
  }, []);

  const loadInstrument = useCallback(
    async (instrumentId: string) => {
      if (
        !INSTRUMENT_CONFIGS[instrumentId] ||
        instruments[instrumentId]?.isLoaded
      ) {
        return;
      }

      if (instrumentId === DEFAULT_INSTRUMENT_ID) {
        // Default synth is already 'loaded' (instantiated)
        setCurrentInstrumentId(instrumentId);
        return;
      }

      setIsLoading(true);
      try {
        const config = INSTRUMENT_CONFIGS[instrumentId];
        const sampler = new Tone.Sampler({
          urls: config.urls,
          baseUrl: "/samples/", // Assuming samples are in /public/samples/
          volume: 18, // Increase volume by 6dB (approximately double)
          onload: () => {
            setInstruments((prev) => ({
              ...prev,
              [instrumentId]: {
                ...prev[instrumentId],
                sampler,
                isLoaded: true,
              },
            }));
            setCurrentInstrumentId(instrumentId);
            setIsLoading(false);
            console.log(`${config.name} loaded successfully.`);
          },
        }).toDestination();
      } catch (error) {
        console.error(`Error loading instrument ${instrumentId}:`, error);
        setIsLoading(false);
        // Fallback to default synth if loading fails
        setCurrentInstrumentId(DEFAULT_INSTRUMENT_ID);
      }
    },
    [instruments]
  );

  // Effect to load the default or selected instrument initially
  useEffect(() => {
    if (
      instruments[currentInstrumentId] &&
      !instruments[currentInstrumentId].isLoaded
    ) {
      loadInstrument(currentInstrumentId);
    } else if (
      instruments[currentInstrumentId]?.isLoaded &&
      instruments[currentInstrumentId]?.sampler === null &&
      currentInstrumentId !== DEFAULT_INSTRUMENT_ID
    ) {
      // This case might happen if state was reset, attempt to reload
      loadInstrument(currentInstrumentId);
    }
  }, [currentInstrumentId, instruments, loadInstrument]);

  const changeInstrument = useCallback(
    (instrumentId: string) => {
      if (INSTRUMENT_CONFIGS[instrumentId]) {
        if (instruments[instrumentId]?.isLoaded) {
          setCurrentInstrumentId(instrumentId);
        } else {
          loadInstrument(instrumentId); // This will also set it as current upon successful load
        }
      } else {
        console.warn(
          `Instrument configuration for '${instrumentId}' not found.`
        );
      }
    },
    [instruments, loadInstrument]
  );

  const currentSampler = instruments[currentInstrumentId]?.sampler;

  return {
    instruments: Object.values(instruments).map((inst) => ({
      id: inst.id,
      name: inst.name,
      isLoaded: inst.isLoaded,
    })),
    currentInstrumentId,
    currentSampler,
    isLoading,
    changeInstrument,
    availableInstrumentConfigs: INSTRUMENT_CONFIGS,
  };
}
