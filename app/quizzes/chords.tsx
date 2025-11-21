import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chord, Range } from "tonal";
import * as Tone from "tone";
import { shuffle } from "~/utils/shuffle";
import { useInstrument } from "~/hooks/useInstrument"; // Added import
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
const NOTES = Range.chromatic(["C3", "C5"], { sharps: true });
const ALL_QUALITIES = ["maj", "min", "aug", "dim", "maj7", "min7", "7", "m7b5"];
const TRIAD_QUALITIES = ["maj", "min", "aug", "dim"];
const ALL_INVERSIONS = ["fund", "1ra", "2da", "3ra"];
const ALL_ACCOMPANIMENTS = ["bloque", "arpegio", "alberti", "vals"];

// Synth initialization will be handled by useInstrument hook

export default function ChordQuiz() {
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
  const [currentChord, setCurrentChord] = useState({
    root: "",
    quality: "",
    inversion: "",
    accompaniment: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(true);
  const [activeQualities, setActiveQualities] = useState<string[]>([
    "maj",
    "min",
  ]);
  const [activeInversions, setActiveInversions] = useState<string[]>(["fund"]);
  const [activeAccompaniments, setActiveAccompaniments] = useState<string[]>([
    "bloque",
  ]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [askForInversion, setAskForInversion] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [selectedInversion, setSelectedInversion] = useState<string | null>(
    null
  );

  // Stats tracking
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [answerLog, setAnswerLog] = useState<
    { correct: string; user: string; isCorrect: boolean }[]
  >([]);

  // Use useRef to hold the question generator instances
  const qualityGenerator = useRef(new QuestionGenerator(activeQualities));
  const accompanimentGenerator = useRef(
    new QuestionGenerator(activeAccompaniments)
  );
  const inversionGenerator = useRef(new QuestionGenerator(activeInversions));
  const noteGenerator = useRef(new QuestionGenerator(NOTES));

  // Update generators when options change
  useEffect(() => {
    qualityGenerator.current.updateOptions(activeQualities);
  }, [activeQualities]);

  useEffect(() => {
    accompanimentGenerator.current.updateOptions(activeAccompaniments);
  }, [activeAccompaniments]);

  useEffect(() => {
    inversionGenerator.current.updateOptions(activeInversions);
  }, [activeInversions]);

  const resetStats = useCallback(() => {
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setAnswerLog([]);
    setFeedback(null);
  }, []);

  const playChord = useCallback(
    (
      root: string,
      quality: string,
      sampler: Tone.Sampler | Tone.PolySynth | null,
      inversion: string,
      accompaniment: string
    ) => {
      if (!sampler) return;
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();

      const chordDegrees = Chord.degrees(quality, root);
      const chordNotes = Chord.notes(quality, root);

      let chordInversion = [1, 2, 3, 4].map(chordDegrees); // => ["C4", "Eb4", "G4", "Bb4"]

      if (inversion === "1ra") {
        chordInversion = [2, 3, 4, 5].map(chordDegrees); // => ["Eb4", "G4", "Bb4", "C5"]
      } else if (inversion === "2da") {
        chordInversion = [3, 4, 5, 6].map(chordDegrees); // => ["G4", "Bb4", "C5", "Eb5"]
      } else if (inversion === "3ra") {
        if (chordNotes.length > 3) {
          chordInversion = [4, 5, 6, 7].map(chordDegrees); // => ["Bb4", "C5", "Eb5", "G5"]
        }
        // if less than 3 default to root
      }

      // Ensure notes are within the C3-B5 range
      let finalChordNotes = [...chordInversion];
      const MAX_MIDI = 72; // C5

      const isTooHigh = (notes: string[]) =>
        notes.some((note) => Tone.Frequency(note).toMidi() > MAX_MIDI);

      const transposeDown = (note: string): string => {
        const pc = note.slice(0, -1);
        const oct = parseInt(note.slice(-1), 10);
        if (isNaN(oct)) return note; // Should not happen
        return `${pc}${oct - 1}`;
      };

      while (isTooHigh(finalChordNotes)) {
        finalChordNotes = finalChordNotes.map(transposeDown);
      }

      if (finalChordNotes.length) {
        if (sampler instanceof Tone.Sampler || sampler instanceof Tone.PolySynth) {
          if (accompaniment === "bloque") {
            transport.scheduleOnce((time) => {
              sampler.triggerAttackRelease(finalChordNotes, "2n", time);
            }, 0);
          }
          if (accompaniment === "arpegio") {
            finalChordNotes.forEach((note, index) => {
              transport.scheduleOnce((time) => {
                sampler.triggerAttackRelease(note, "4n", time);
              }, index * 0.3);
            });
          }
          if (accompaniment === "alberti") {
            if (finalChordNotes.length < 4) {
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                0.3
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[1], "4n", time),
                0.6
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                0.9
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                1.2
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                1.5
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[1], "4n", time),
                1.8
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                2.1
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                2.4
              );
            }
            if (finalChordNotes.length >= 4) {
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                0.3
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[1], "4n", time),
                0.6
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[3], "4n", time),
                0.9
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                1.2
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[2], "4n", time),
                1.5
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[1], "4n", time),
                1.8
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[3], "4n", time),
                2.1
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                2.4
              );
            }
          }
          if (accompaniment === "vals") {
            if (finalChordNotes.length < 4) {
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [finalChordNotes[1], finalChordNotes[2]],
                    "4n",
                    time
                  ),
                0.3
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [finalChordNotes[1], finalChordNotes[2]],
                    "4n",
                    time
                  ),
                0.6
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0.9
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [finalChordNotes[1], finalChordNotes[2]],
                    "4n",
                    time
                  ),
                1.2
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [finalChordNotes[1], finalChordNotes[2]],
                    "4n",
                    time
                  ),
                1.5
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                1.8
              );
            }
            if (finalChordNotes.length >= 4) {
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [
                      finalChordNotes[1],
                      finalChordNotes[2],
                      finalChordNotes[3],
                    ],
                    "4n",
                    time
                  ),
                0.3
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [
                      finalChordNotes[1],
                      finalChordNotes[2],
                      finalChordNotes[3],
                    ],
                    "4n",
                    time
                  ),
                0.6
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                0.9
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [
                      finalChordNotes[1],
                      finalChordNotes[2],
                      finalChordNotes[3],
                    ],
                    "4n",
                    time
                  ),
                1.2
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(
                    [
                      finalChordNotes[1],
                      finalChordNotes[2],
                      finalChordNotes[3],
                    ],
                    "4n",
                    time
                  ),
                1.5
              );
              transport.scheduleOnce(
                (time) =>
                  sampler.triggerAttackRelease(finalChordNotes[0], "4n", time),
                1.8
              );
            }
          }
        }
        transport.start();
        console.log(
          `Playing ${root} ${quality} chord with ${currentInstrumentId}: ${finalChordNotes.join(
            " "
          )}`
        );
      } else {
        console.log(`Could not get notes for ${root} ${quality}`);
      }
    },
    [currentInstrumentId]
  );

  const generateQuestion = useCallback(() => {
    if (
      activeQualities.length < 2 ||
      activeInversions.length < 1 ||
      activeAccompaniments.length < 1
    )
      return;

    const root = noteGenerator.current.getNext();
    const quality = qualityGenerator.current.getNext();
    const accompaniment = accompanimentGenerator.current.getNext();
    const isTriad = TRIAD_QUALITIES.includes(quality);

    let inversion: string | null = null;
    let attempts = 0;
    const maxAttempts = activeInversions.length;

    // Loop to find a valid inversion, discarding invalid ones
    while (inversion === null && attempts < maxAttempts) {
      const potentialInversion = inversionGenerator.current.getNext();
      const isInvalid = isTriad && potentialInversion === "3ra";

      if (!isInvalid) {
        inversion = potentialInversion;
      }
      attempts++;
    }

    // Fallback if no valid inversion is found (e.g., only '3ra' is active with triads)
    if (inversion === null) {
      if (activeInversions.includes("fund")) {
        inversion = "fund";
      } else {
        // If 'fund' is not active, just use the first available inversion.
        inversion = activeInversions[0];
      }
    }

    setCurrentChord({ root, quality, inversion, accompaniment });
    setFeedback(null);
    setIsAnswering(true);
    setSelectedQuality(null);
    setSelectedInversion(null);
    if (currentSampler) {
      playChord(root, quality, currentSampler, inversion, accompaniment);
    }
  }, [
    activeQualities,
    activeInversions,
    activeAccompaniments,
    currentSampler,
    playChord,
  ]);

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
    activeInversions,
    activeAccompaniments,
    askForInversion,
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

  function toggleInversion(inversion: string) {
    const isDeselecting = activeInversions.includes(inversion);
    const minInversions = askForInversion ? 2 : 1;
    if (isDeselecting && activeInversions.length <= minInversions) {
      return;
    }
    setActiveInversions((prev) =>
      isDeselecting
        ? prev.filter((i) => i !== inversion)
        : [...prev, inversion]
    );
  }

  function toggleAccompaniment(accompaniment: string) {
    const isDeselecting = activeAccompaniments.includes(accompaniment);
    if (isDeselecting && activeAccompaniments.length <= 1) {
      return;
    }
    setActiveAccompaniments((prev) =>
      isDeselecting
        ? prev.filter((a) => a !== accompaniment)
        : [...prev, accompaniment]
    );
  }

  function handleAskForInversionChange(checked: boolean) {
    setAskForInversion(checked);
    if (checked && activeInversions.length < 2) {
      setActiveInversions((prev) => [...new Set([...prev, "fund", "2da"])]);
    }
  }

  // Handle user answer selection
  function handleAnswer(selected: string) {
    // Prevent multiple answers while feedback is showing
    if (!isAnswering) return;

    if (askForInversion) {
      setSelectedQuality(selected);
    } else {
      setIsAnswering(false);
      setTotalQuestions((prev) => prev + 1);

      const isCorrect = selected === currentChord.quality;
      if (isCorrect) {
        setCorrectAnswers((prev) => prev + 1);
        setFeedback("✅ Correcto!");
      } else {
        setWrongAnswers((prev) => prev + 1);
        setFeedback(`❌ Error! era ${currentChord.quality}`);
      }

      // Store all answers
      setAnswerLog((prev) => [
        ...prev,
        { correct: currentChord.quality, user: selected, isCorrect },
      ]);

      setTimeout(generateQuestion, 1500); // Generate new question after 1.5s
    }
  }

  function handleInversionAnswer(selectedInversionValue: string) {
    if (!isAnswering || !selectedQuality) return;

    setSelectedInversion(selectedInversionValue);

    setIsAnswering(false);
    setTotalQuestions((prev) => prev + 1);

    const qualityIsCorrect = selectedQuality === currentChord.quality;
    const inversionIsCorrect =
      selectedInversionValue === currentChord.inversion;
    const isCorrect = qualityIsCorrect && inversionIsCorrect;

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setFeedback("✅ Correcto!");
    } else {
      setWrongAnswers((prev) => prev + 1);
      setFeedback(
        `❌ Error! era ${currentChord.quality} ${currentChord.inversion}`
      );
    }

    // Store all answers
    setAnswerLog((prev) => [
      ...prev,
      {
        correct: `${currentChord.quality} ${currentChord.inversion}`,
        user: `${selectedQuality} ${selectedInversionValue}`,
        isCorrect,
      },
    ]);

    setTimeout(generateQuestion, 1500); // Generate new question after 1.5s
  }

  // Initialize the first question when component mounts
  useEffect(() => {
    // Prevent multiple initial renders
    if (!hasGeneratedRef.current && currentSampler) {
      // Ensure sampler is ready
      generateQuestion();
      hasGeneratedRef.current = true;
    }
  }, [currentSampler]); // Add currentSampler to dependency array

  // Ref to track if initial question has been generated
  const hasGeneratedRef = useRef(false);

  function play() {
    playChord(
      currentChord.root,
      currentChord.quality,
      currentSampler,
      currentChord.inversion,
      currentChord.accompaniment
    );
  }

  const quizState: QuizState = {
    qn: "Reconocimiento de Acordes",
    config: {
      activeQualities,
      activeInversions,
      activeAccompaniments,
      askForInversion,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      r: currentChord.root,
      q: currentChord.quality,
      i: currentChord.inversion,
      a: currentChord.accompaniment,
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
        <SectionHeader title="Reconocimiento de Acordes" />
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
              text="Reproducir Acorde"
              play={play}
            />

            {/* Feedback or Instruction Message - Always Present */}
            <Feedback
              text={
                askForInversion
                  ? selectedQuality
                    ? "Paso 2: Selecciona la inversión"
                    : "Paso 1: Selecciona el tipo de acorde"
                  : "Selecciona el acorde que escuchas"
              }
              feedback={feedback}
            />

            {/* Answer Buttons - Main Focus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full max-w-2xl">
              {ALL_QUALITIES.map((option) => {
                const isActive = activeQualities.includes(option);
                const isSelected = selectedQuality === option;
                return (
                  <QuizOptionButton
                    key={option}
                    isActive={isActive}
                    isAnswering={isAnswering}
                    option={option}
                    handleAnswer={handleAnswer}
                    isSelected={isSelected}
                  />
                );
              })}
            </div>

            {askForInversion && (
              <div className="w-full max-w-2xl text-center flex flex-col items-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full">
                  {ALL_INVERSIONS.map((option) => {
                    const isSelected = selectedInversion === option;
                    return (
                      <QuizOptionButton
                        key={option}
                        isActive={true}
                        isAnswering={isAnswering && selectedQuality !== null}
                        option={option}
                        handleAnswer={handleInversionAnswer}
                        isSelected={isSelected}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats Section - Compact */}
            <Stats
              totalQuestions={totalQuestions}
              correctAnswers={correctAnswers}
              wrongAnswers={wrongAnswers}
            />
            <ShareButton quizState={quizState} disabled={answerLog.length === 0} />

            {/* Answer Log removed from here - now in side panel */}
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
          title="Tipos de Acordes"
          options={ALL_QUALITIES}
          activeOptions={activeQualities}
          toggleOption={toggleQuality}
        />
        <OptionSelector
          title="Inversion de Acordes"
          options={ALL_INVERSIONS}
          activeOptions={activeInversions}
          toggleOption={toggleInversion}
        />
        <OptionSelector
          title="Acompañamiento de Acordes"
          options={ALL_ACCOMPANIMENTS}
          activeOptions={activeAccompaniments}
          toggleOption={toggleAccompaniment}
        />
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Preguntas de Inversión
          </h3>
          <label className="flex items-center space-x-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={askForInversion}
              onChange={(e) => handleAskForInversionChange(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Activar preguntas de inversión</span>
          </label>
        </div>
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