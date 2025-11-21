import React, { useState, useEffect, useRef, useCallback } from "react";
import { Range } from "tonal";
import { Note } from "tonal";
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

// Define possible root notes and chord qualities
const NOTES = Range.chromatic(["G2", "G4"], { sharps: true });
const ALL_QUALITIES = [
  "2m",
  "2M",
  "3m",
  "3M",
  "4P",
  "5d",
  "5P",
  "6m",
  "6M",
  "7m",
  "7M",
  "8P",
];
const DIRECTIONS_MAP: Record<string, string> = {
  up: "Ascendente",
  down: "Descendente",
  harmonic: "Armónico",
};
const ALL_DIRECTIONS = Object.keys(DIRECTIONS_MAP);

// Synth initialization will be handled by useInstrument hook

export default function IntervalQuiz() {
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
  const [currentInterval, setCurrentInterval] = useState({
    root: "",
    quality: "",
    direction: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(true);
  const [activeQualities, setActiveQualities] = useState<string[]>([
    "2M",
    "3M",
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
  const qualityGenerator = useRef(new QuestionGenerator(activeQualities));
  const directionGenerator = useRef(new QuestionGenerator(activeDirections));
  const noteGenerator = useRef(new QuestionGenerator(NOTES));

  // Update generators when options change
  useEffect(() => {
    qualityGenerator.current.updateOptions(activeQualities);
  }, [activeQualities]);

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

  const playInterval = useCallback(
    (
      root: string,
      quality: string,
      direction: string,
      sampler: Tone.Sampler | Tone.PolySynth | null
    ) => {
      if (!sampler) return;
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();

      const intervalNote = Note.transpose(root, quality);

      // Ensure notes are within the C3-B5 range
      let notesToPlay = [root, intervalNote];
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

      const finalRoot = notesToPlay[0];
      const finalIntervalNote = notesToPlay[1];

      if (sampler instanceof Tone.Sampler || sampler instanceof Tone.PolySynth) {
        if (direction === "harmonic") {
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(notesToPlay, "2n", time);
          }, 0);
          console.log(
            `Playing harmonic interval ${root} ${quality} with ${currentInstrumentId}: ${notesToPlay.join(
              " "
            )}`
          );
        } else if (direction === "up") {
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(finalRoot, "4n", time);
          }, 0);
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(finalIntervalNote, "4n", time);
          }, 0.6);
          console.log(
            `Playing ascending interval ${root} ${quality} with ${currentInstrumentId}: ${finalRoot} -> ${finalIntervalNote}`
          );
        } else {
          // down
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(finalIntervalNote, "4n", time);
          }, 0);
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(finalRoot, "4n", time);
          }, 0.6);
          console.log(
            `Playing descending interval ${root} ${quality} with ${currentInstrumentId}: ${finalIntervalNote} -> ${finalRoot}`
          );
        }
        transport.start();
      } else {
        console.log(`Sampler not ready for interval ${root} ${quality}`);
      }
    },
    [currentInstrumentId]
  );

  const generateQuestion = useCallback(() => {
    if (activeQualities.length < 2 || activeDirections.length < 1) return;

    const root = noteGenerator.current.getNext();
    const quality = qualityGenerator.current.getNext();
    const direction = directionGenerator.current.getNext();

    setCurrentInterval({ root, quality, direction });
    setIsAnswering(true);
    setFeedback(null);
    if (currentSampler) {
      playInterval(root, quality, direction, currentSampler);
    }
  }, [activeQualities, activeDirections, currentSampler, playInterval]);

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
    activeQualities,
    activeDirections,
    resetStats,
    generateQuestion,
  ]);

  function toggleQuality(quality: string) {
    const isDeselecting = activeQualities.includes(quality);
    if (isDeselecting && activeQualities.length <= 2) {
      return;
    }
    setActiveQualities((prev) =>
      isDeselecting ? prev.filter((q) => q !== quality) : [...prev, quality]
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

    const isCorrect = selected === currentInterval.quality;
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setFeedback("✅ Correcto!");
    } else {
      setWrongAnswers((prev) => prev + 1);
      setFeedback(`❌ Error! era ${currentInterval.quality}`);
    }

    // Store all answers
    setAnswerLog((prev) => [
      ...prev,
      { correct: currentInterval.quality, user: selected, isCorrect },
    ]);

    setTimeout(generateQuestion, 1500); // Generate new question after 1.5s
  }

  const quizState: QuizState = {
    qn: "Reconocimiento de Intervalos",
    config: {
      activeQualities,
      activeDirections,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      r: currentInterval.root,
      q: currentInterval.quality,
      d: currentInterval.direction,
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
        <SectionHeader title="Reconocimiento de Intervalos" />
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
              text="Reproducir Intervalo"
              play={() => {
                if (currentSampler) {
                  playInterval(
                    currentInterval.root,
                    currentInterval.quality,
                    currentInterval.direction,
                    currentSampler
                  );
                }
              }}
            />

            {/* Feedback or Instruction Message - Always Present */}
            <Feedback
              text="Selecciona el intervalo que escuchas"
              feedback={feedback}
            />

            {/* Answer Buttons - Main Focus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full max-w-2xl">
              {ALL_QUALITIES.map((option) => {
                const isActive = activeQualities.includes(option);
                return (
                  <QuizOptionButton
                    key={option}
                    isActive={isActive}
                    isAnswering={isAnswering}
                    option={option}
                    handleAnswer={handleAnswer}
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

        {/* Quality Filter UI - More Elegant */}
        <OptionSelector
          title="Tipos de Intervalos"
          options={ALL_QUALITIES}
          activeOptions={activeQualities}
          toggleOption={toggleQuality}
        />

        {/* Direction Filter UI */}
        <OptionSelector
          title="Dirección del Intervalo"
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
        <AnswerHistory answerLog={answerLog} />
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