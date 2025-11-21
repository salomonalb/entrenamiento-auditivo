import React, { useState, useEffect, useRef, useCallback } from "react";
import { Scale, Range, Note } from "tonal";
import * as Tone from "tone";
import { shuffle } from "~/utils/shuffle";
import { useInstrument } from "~/hooks/useInstrument";
import NavButton from "~/components/NavButton";
import SectionHeader from "~/components/sectionHeader";
import UIContainer from "~/components/UIContainer";
import Clock from "~/components/Clock";
import Cog from "~/components/Cog";
import CircleButton from "~/components/CircleButton";
import Feedback from "~/components/Feedback";
import PlayButton from "~/components/PlayButton";
import QuizOptionButton from "~/components/QuizOptionButton";
import Stats from "~/components/Stats";
import Overlay from "~/components/Overlay";
import SidePanel from "~/components/SidePanel";
import InstrumentSelector from "~/components/InstrumentSelector";
import OptionSelector from "~/components/OptionsSelector";
import AnswerHistory from "~/components/AnswerHistory";
import { type QuizState } from "~/utils/urlState";
import ShareButton from "~/components/ShareButton";
import { QuestionGenerator } from "~/utils/questionGenerator";

// Define possible root notes and scale types (Placeholder)
const NOTES = Range.chromatic(["C3", "C4"], { sharps: true });
// Define common scales and their Spanish translations
const COMMON_SCALES_MAP: Record<string, string> = {
  major: "Mayor",
  minor: "Menor Natural",
  "harmonic minor": "Menor Armónica",
  "melodic minor": "Menor Melódica",
  "major pentatonic": "Pentatónica Mayor",
  "minor pentatonic": "Pentatónica Menor",
  dorian: "Dórico",
  phrygian: "Frigio",
  lydian: "Lidio",
  mixolydian: "Mixolidio",
  locrian: "Locrio",
};
const ALL_SCALES = Object.keys(COMMON_SCALES_MAP);
const DIRECTIONS_MAP: Record<string, string> = {
  up: "Ascendente",
  down: "Descendente",
};
const ALL_DIRECTIONS = Object.keys(DIRECTIONS_MAP);

export default function ScalesQuiz() {
  const {
    instruments,
    currentInstrumentId,
    currentSampler,
    isLoading,
    changeInstrument,
    availableInstrumentConfigs,
  } = useInstrument();
  const currentInstrumentName =
    availableInstrumentConfigs[currentInstrumentId]?.name ||
    currentInstrumentId;
  const [currentScale, setCurrentScale] = useState({
    root: "",
    type: "",
    direction: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(true);
  const [activeScales, setActiveScales] = useState<string[]>([
    "major", // Default active scales (Tonal.js names)
    "minor",
  ]);
  const [activeDirections, setActiveDirections] = useState<string[]>(["up"]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Stats tracking
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [answerLog, setAnswerLog] = useState<
    { correct: string; user: string; isCorrect: boolean }[]
  >([]);

  // Use useRef to hold the question generator instances
  const scaleGenerator = useRef(new QuestionGenerator(activeScales));
  const directionGenerator = useRef(new QuestionGenerator(activeDirections));
  const noteGenerator = useRef(new QuestionGenerator(NOTES));

  // Update generators when options change
  useEffect(() => {
    scaleGenerator.current.updateOptions(activeScales);
  }, [activeScales]);

  useEffect(() => {
    directionGenerator.current.updateOptions(activeDirections);
  }, [activeDirections]);

  const resetStats = useCallback(() => {
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setAnswerLog([]);
    setFeedback(null);
  }, []);

  const playScale = useCallback(
    (
      root: string,
      scaleType: string,
      direction: string,
      sampler: Tone.Sampler | Tone.PolySynth | null
    ) => {
      if (!sampler) return;
      const scaleData = Scale.get(`${root} ${scaleType}`);

      if (scaleData.notes.length) {
        let scaleNotesWithOctave = [...scaleData.notes];

        // Add the octave to complete the scale
        if (scaleNotesWithOctave.length > 0) {
          const rootNote = scaleNotesWithOctave[0];
          const pc = rootNote.slice(0, -1);
          const oct = parseInt(rootNote.slice(-1), 10);
          if (!isNaN(oct)) {
            const octaveNote = `${pc}${oct + 1}`;
            scaleNotesWithOctave.push(octaveNote);
          }
        }

        let notesToPlay = scaleNotesWithOctave;

        if (direction === "down") {
          notesToPlay.reverse();
        }

        // Ensure notes are within the C3-C5 range
        const MAX_MIDI = 72; // C5
        const isTooHigh = (notes: string[]) =>
          notes.some((note) => Tone.Frequency(note).toMidi() > MAX_MIDI);

        const transposeDown = (note: string): string => {
          const pc = note.slice(0, -1);
          const oct = parseInt(note.slice(-1), 10);
          if (isNaN(oct)) return note; // Should not happen
          return `${pc}${oct - 1}`;
        };

        while (isTooHigh(notesToPlay)) {
          notesToPlay = notesToPlay.map(transposeDown);
        }

        const transport = Tone.getTransport();
        transport.stop();
        transport.cancel();

        notesToPlay.forEach((note, index) => {
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(note, "4n", time);
          }, index * 0.6);
        });

        transport.start();

        console.log(
          `Playing ${root} ${scaleType} ${direction} scale with ${currentInstrumentId}: ${notesToPlay.join(
            " "
          )}`
        );
      } else {
        console.log(`Could not get notes for ${root} ${scaleType}`);
      }
    },
    [currentInstrumentId]
  );

  const generateQuestion = useCallback(() => {
    if (activeScales.length < 2 || activeDirections.length < 1) return;

    const root = noteGenerator.current.getNext();
    const scaleType = scaleGenerator.current.getNext();
    const direction = directionGenerator.current.getNext();

    setCurrentScale({ root, type: scaleType, direction });
    setFeedback(null);
    setIsAnswering(true);

    if (currentSampler) {
      playScale(root, scaleType, direction, currentSampler);
    }
  }, [activeScales, activeDirections, currentSampler, playScale]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (currentSampler) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        generateQuestion();
      } else {
        resetStats();
        generateQuestion();
      }
    }
  }, [
    currentSampler,
    activeScales,
    activeDirections,
    resetStats,
    generateQuestion,
  ]);

  function toggleScale(scaleType: string) {
    const isDeselecting = activeScales.includes(scaleType);
    if (isDeselecting && activeScales.length <= 2) {
      return;
    }
    setActiveScales((prev) =>
      isDeselecting ? prev.filter((s) => s !== scaleType) : [...prev, scaleType]
    );
  }

  function toggleDirection(direction: string) {
    const isDeselecting = activeDirections.includes(direction);
    if (isDeselecting && activeDirections.length <= 1) {
      return;
    }
    setActiveDirections((prev) =>
      isDeselecting ? prev.filter((d) => d !== direction) : [...prev, direction]
    );
  }

  function handleAnswer(selected: string) {
    if (!isAnswering) return;

    setIsAnswering(false);
    setTotalQuestions((prev) => prev + 1);

    const isCorrect = selected === currentScale.type;
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setFeedback("✅ Correcto!");
    } else {
      setWrongAnswers((prev) => prev + 1);
      setFeedback(
        `❌ Error! era ${
          COMMON_SCALES_MAP[currentScale.type] || currentScale.type
        }`
      );
    }

    // Store all answers
    setAnswerLog((prev) => [
      ...prev,
      { correct: currentScale.type, user: selected, isCorrect },
    ]);

    setTimeout(generateQuestion, 1500); // Generate new question after 1.5s
  }

  // Ref to track if initial question has been generated
  const hasGeneratedRef = useRef(false);

  // Initialize the first question when component mounts
  useEffect(() => {
    // Prevent multiple initial renders
    if (!hasGeneratedRef.current && currentSampler) {
      // Ensure sampler is ready
      generateQuestion();
      hasGeneratedRef.current = true;
    }
  }, [currentSampler]); // Add currentSampler to dependency array

  const quizState: QuizState = {
    qn: "Reconocimiento de Escalas",
    config: {
      activeScales,
      activeDirections,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      r: currentScale.root,
      t: currentScale.type,
      d: currentScale.direction,
    },
  };

  return (
    <div>
      <div className="mb-8">
        <NavButton to="/" name="Menú Principal" />
      </div>
      {/* Main Content Area */}
      <UIContainer>
        {/* Header */}
        <SectionHeader title="Reconocimiento de Escalas" />
        <div className="flex gap-2 justify-end my-4 px-2">
          <CircleButton
            showSidebar={showHistory}
            setShowSidebar={setShowHistory}
          >
            <Clock />
          </CircleButton>
          <CircleButton
            showSidebar={showSettings}
            setShowSidebar={setShowSettings}
          >
            <Cog />
          </CircleButton>
        </div>

        <div className="p-6">
          {/* Main Quiz Area */}
          <div className="flex flex-col items-center">
            {/* Replay Button - Prominent */}
            <PlayButton
              currentSampler={currentSampler}
              isLoading={isLoading}
              isAnswering={isAnswering}
              text="Reproducir Escala"
              play={() => {
                if (currentSampler) {
                  playScale(
                    currentScale.root,
                    currentScale.type,
                    currentScale.direction,
                    currentSampler
                  );
                }
              }}
            />

            {/* Feedback or Instruction Message - Always Present */}
            <Feedback
              text="Selecciona el tipo de escala que escuchas"
              feedback={feedback}
            />

            {/* Answer Buttons - Main Focus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full max-w-2xl">
              {ALL_SCALES.map((option) => {
                const isActive = activeScales.includes(option);
                return (
                  <QuizOptionButton
                    key={option}
                    isActive={isActive}
                    isAnswering={isAnswering}
                    option={COMMON_SCALES_MAP[option] || option}
                    handleAnswer={() => handleAnswer(option)}
                  />
                );
              })}
            </div>

            {/* Stats Section - Compact */}
            <Stats
              totalQuestions={totalQuestions}
              correctAnswers={correctAnswers}
              wrongAnswers={wrongAnswers}
            />
            <ShareButton quizState={quizState} disabled={answerLog.length === 0} />
          </div>
        </div>
      </UIContainer>

      {/* Side Panels - Settings and History */}
      {/* Settings Panel - Slide-in from right */}
      <SidePanel
        text="Configuración"
        showPanel={showSettings}
        setShowPanel={setShowSettings}
      >
        {/* Instrument Selector */}
        <InstrumentSelector
          currentInstrumentId={currentInstrumentId}
          changeInstrument={changeInstrument}
          isLoading={isLoading}
          availableInstrumentConfigs={availableInstrumentConfigs}
        />

        {/* Scale Filter UI - More Elegant */}
        <OptionSelector
          title="Tipos de Escalas"
          options={ALL_SCALES.map((scale) => COMMON_SCALES_MAP[scale])}
          activeOptions={activeScales.map(
            (scale) => COMMON_SCALES_MAP[scale]
          )}
          toggleOption={(spanishName) => {
            const englishKey = Object.keys(COMMON_SCALES_MAP).find(
              (key) => COMMON_SCALES_MAP[key] === spanishName
            );
            if (englishKey) {
              toggleScale(englishKey);
            }
          }}
        />

        {/* Direction Filter UI */}
        <OptionSelector
          title="Dirección de la Escala"
          options={ALL_DIRECTIONS.map((dir) => DIRECTIONS_MAP[dir])}
          activeOptions={activeDirections.map((dir) => DIRECTIONS_MAP[dir])}
          toggleOption={(spanishName) => {
            const englishKey = Object.keys(DIRECTIONS_MAP).find(
              (key) => DIRECTIONS_MAP[key] === spanishName
            );
            if (englishKey) {
              toggleDirection(englishKey);
            }
          }}
        />
      </SidePanel>

      {/* History Panel - Slide-in from right */}
      <SidePanel
        text="Historial de Respuestas"
        showPanel={showHistory}
        setShowPanel={setShowHistory}
      >
        <AnswerHistory
          answerLog={answerLog.map((entry) => ({
            ...entry,
            correct: COMMON_SCALES_MAP[entry.correct] || entry.correct,
            user: COMMON_SCALES_MAP[entry.user] || entry.user,
          }))}
        />
      </SidePanel>

      {/* Overlay for when panels are open */}
      {(showSettings || showHistory) && (
        <Overlay
          setShowHistory={setShowHistory}
          setShowSettings={setShowSettings}
        />
      )}
    </div>
  );
}