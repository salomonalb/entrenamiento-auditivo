import React, { useState, useEffect, useRef, useCallback } from "react";
import { Scale, Range, Chord } from "tonal";
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

// Define possible root notes
const NOTES = Range.chromatic(["C3", "B3"], { sharps: true });

// Define diatonic scales and their Spanish translations for this module
const DIATONIC_SCALES_MAP: Record<string, string> = {
  major: "Mayor",
  minor: "Menor (Natural)",
  "harmonic minor": "Menor Armónica",
  "melodic minor": "Menor Melódica",
  dorian: "Dórico",
  phrygian: "Frigio",
  lydian: "Lidio",
  mixolydian: "Mixolidio",
  locrian: "Locrio",
};
const ALL_DIATONIC_SCALES = Object.keys(DIATONIC_SCALES_MAP);
const ALL_DEGREES = ["1", "2", "3", "4", "5", "6", "7"];

interface Question {
  root: string;
  scaleType: string;
  degreeNote: string;
  correctDegree: number;
}

export default function ScaleDegreesQuiz() {
  const {
    currentSampler,
    isLoading,
    changeInstrument,
    availableInstrumentConfigs,
    currentInstrumentId,
  } = useInstrument();
  const currentInstrumentName =
    availableInstrumentConfigs[currentInstrumentId]?.name ||
    currentInstrumentId;

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(true);
  const [activeScales, setActiveScales] = useState<string[]>(["major"]);
  const [activeDegrees, setActiveDegrees] = useState<string[]>(ALL_DEGREES);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [keepSameScale, setKeepSameScale] = useState<boolean>(false);

  // Stats tracking
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [answerLog, setAnswerLog] = useState<
    { correct: string; user: string; isCorrect: boolean }[]
  >([]);

  // Use useRef to hold the question generator instances
  const scaleGenerator = useRef(new QuestionGenerator(activeScales));
  const degreeGenerator = useRef(new QuestionGenerator(activeDegrees));
  const noteGenerator = useRef(new QuestionGenerator(NOTES));

  // Update generators when options change
  useEffect(() => {
    scaleGenerator.current.updateOptions(activeScales);
  }, [activeScales]);

  useEffect(() => {
    degreeGenerator.current.updateOptions(activeDegrees);
  }, [activeDegrees]);

  const retryCountRef = useRef(0);
  const currentQuestionRef = useRef(currentQuestion);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  });

  const resetStats = useCallback(() => {
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setAnswerLog([]);
    setFeedback(null);
  }, []);

  const playQuestionSound = useCallback(
    (
      rootNote: string,
      scaleType: string,
      degreeNoteToPlay: string, // This is now for logging/reference only
      sampler: Tone.Sampler | Tone.PolySynth | null,
      correctDegreeNumber: number
    ) => {
      if (!sampler) return;

      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();

      const fallback = () => {
        console.warn(`Falling back to tonic chord for ${rootNote} ${scaleType}`);
        const tonicChordNotes = Chord.get(`${rootNote}M`).notes;
        if (sampler instanceof Tone.Sampler || sampler instanceof Tone.PolySynth) {
          transport.scheduleOnce((time) => {
            sampler.triggerAttackRelease(tonicChordNotes, "1n", time);
          }, 0);
          transport.scheduleOnce(
            (time) => {
              sampler.triggerAttackRelease(degreeNoteToPlay, "0.5n", time);
            },
            Tone.Time("1n").toSeconds() + 0.3
          );
          transport.start();
        }
      };

      const scaleData = Scale.get(`${rootNote} ${scaleType}`);

      if (!scaleData || !scaleData.notes || scaleData.notes.length < 7) {
        console.error(`Could not get scale notes for ${rootNote} ${scaleType}`);
        fallback();
        return;
      }

      let sevenNotes = scaleData.notes.slice(0, 7);

      // Transposition logic
      const MAX_MIDI = 72; // C5
      const noteAt = (degree: number, notes: string[]): string => {
        const index = degree - 1;
        const octaveOffset = Math.floor(index / 7);
        const baseNote = notes[index % 7];
        const pc = baseNote.slice(0, -1);
        const oct = parseInt(baseNote.slice(-1), 10);
        if (isNaN(oct)) return "C4"; // Safeguard
        return `${pc}${oct + octaveOffset}`;
      };

      const transposeDown = (note: string): string => {
        const pc = note.slice(0, -1);
        const oct = parseInt(note.slice(-1), 10);
        if (isNaN(oct)) return note;
        return `${pc}${oct - 1}`;
      };

      // Check against the highest possible note we might generate (from the V chord, degree 9)
      let tempHighestNote = noteAt(9, sevenNotes);
      while (Tone.Frequency(tempHighestNote).toMidi() > MAX_MIDI) {
        sevenNotes = sevenNotes.map(transposeDown);
        tempHighestNote = noteAt(9, sevenNotes);
      }

      // Build chords using the potentially transposed notes
      const finalNoteAt = (degree: number) => noteAt(degree, sevenNotes);
      const chordI_notes = [finalNoteAt(1), finalNoteAt(3), finalNoteAt(5)];
      const chordIV_notes = [finalNoteAt(4), finalNoteAt(6), finalNoteAt(8)];
      const chordV_notes = [finalNoteAt(5), finalNoteAt(7), finalNoteAt(9)];
      const finalDegreeNoteToPlay = finalNoteAt(correctDegreeNumber);

      const chordDuration = "4n";
      const timeStep = 0.6;

      if (sampler instanceof Tone.Sampler || sampler instanceof Tone.PolySynth) {
        transport.scheduleOnce(
          (time) =>
            sampler.triggerAttackRelease(chordI_notes, chordDuration, time),
          0
        );
        transport.scheduleOnce(
          (time) =>
            sampler.triggerAttackRelease(chordIV_notes, chordDuration, time),
          timeStep
        );
        transport.scheduleOnce(
          (time) =>
            sampler.triggerAttackRelease(chordV_notes, chordDuration, time),
          2 * timeStep
        );
        transport.scheduleOnce(
          (time) =>
            sampler.triggerAttackRelease(chordI_notes, chordDuration, time),
          3 * timeStep
        );

        const noteDuration = "4n";
        const delayAfterProgression = 0.4;
        const totalProgressionDuration =
          3 * timeStep + Tone.Time(chordDuration).toSeconds();

        transport.scheduleOnce(
          (time) =>
            sampler.triggerAttackRelease(
              finalDegreeNoteToPlay,
              noteDuration,
              time
            ),
          totalProgressionDuration + delayAfterProgression
        );

        transport.start();

        console.log(
          `Playing cadence I-IV-V-I in ${rootNote} ${scaleType} then degree ${finalDegreeNoteToPlay}`
        );
      }
    },
    []
  );

  const generateQuestion = useCallback(() => {
    if (activeScales.length < 1 || activeDegrees.length < 2 || !currentSampler)
      return;

    const root =
      keepSameScale && currentQuestionRef.current
        ? currentQuestionRef.current.root
        : noteGenerator.current.getNext();
    const scaleType =
      keepSameScale && currentQuestionRef.current
        ? currentQuestionRef.current.scaleType
        : scaleGenerator.current.getNext();

    const scaleData = Scale.get(`${root} ${scaleType}`);

    if (!scaleData || !scaleData.notes || scaleData.notes.length === 0) {
      console.error(`Could not get notes for ${root} ${scaleType}`);
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        generateQuestion();
      } else {
        setFeedback(
          `Error al obtener notas para ${
            DIATONIC_SCALES_MAP[scaleType] || scaleType
          }. Intenta con otra escala o recarga.`
        );
        retryCountRef.current = 0;
      }
      return;
    }

    const notesInScale = scaleData.notes;

    if (notesInScale.length < 7) {
      console.warn(
        `Scale ${root} ${scaleType} provided ${
          notesInScale.length
        } notes. Expected 7 for this quiz. Notes: ${notesInScale.join(", ")}`
      );
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        generateQuestion();
      } else {
        setFeedback(
          `Error: La escala ${
            DIATONIC_SCALES_MAP[scaleType] || scaleType
          } no parece tener 7 grados estándar.`
        );
        retryCountRef.current = 0;
      }
      return;
    }

    const sevenDegreeNotes = notesInScale.slice(0, 7);
    const correctDegreeNumber = parseInt(degreeGenerator.current.getNext(), 10);
    const randomDegreeIndex = correctDegreeNumber - 1;
    const randomDegreeNote = sevenDegreeNotes[randomDegreeIndex];

    if (!randomDegreeNote) {
      console.error(
        `Failed to select a random degree note from ${sevenDegreeNotes.join(
          ", "
        )} at index ${randomDegreeIndex} for scale ${root} ${scaleType}`
      );
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        generateQuestion();
      } else {
        setFeedback(
          "Error crítico al generar la nota del grado. Por favor, recarga."
        );
        retryCountRef.current = 0;
      }
      return;
    }

    retryCountRef.current = 0;
    setCurrentQuestion({
      root: root,
      scaleType: scaleType,
      degreeNote: randomDegreeNote,
      correctDegree: correctDegreeNumber,
    });
    setFeedback(null);
    setIsAnswering(true);
    playQuestionSound(
      root,
      scaleType,
      randomDegreeNote,
      currentSampler,
      correctDegreeNumber
    );
  }, [
    activeScales,
    activeDegrees,
    currentSampler,
    playQuestionSound,
    keepSameScale,
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
    activeScales,
    activeDegrees,
    keepSameScale,
    resetStats,
    generateQuestion,
  ]);

  function toggleScale(scaleType: string) {
    const isDeselecting = activeScales.includes(scaleType);
    if (isDeselecting && activeScales.length <= 1) {
      return;
    }
    setActiveScales((prev) =>
      isDeselecting ? prev.filter((s) => s !== scaleType) : [...prev, scaleType]
    );
  }

  function toggleDegree(degree: string) {
    const isDeselecting = activeDegrees.includes(degree);
    if (isDeselecting && activeDegrees.length <= 2) {
      return;
    }
    setActiveDegrees((prev) =>
      isDeselecting ? prev.filter((d) => d !== degree) : [...prev, degree]
    );
  }

  function handleAnswer(selectedDegree: number) {
    if (!isAnswering || !currentQuestion) return;

    setIsAnswering(false);
    setTotalQuestions((prev) => prev + 1);
    const isCorrect = selectedDegree === currentQuestion.correctDegree;

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setFeedback("✅ Correcto!");
    } else {
      setWrongAnswers((prev) => prev + 1);
      setFeedback(
        `❌ Error! Era el grado ${currentQuestion.correctDegree} (${currentQuestion.degreeNote})`
      );
    }

    setAnswerLog((prev) => [
      ...prev,
      {
        correct: currentQuestion.correctDegree.toString(),
        user: selectedDegree.toString(),
        isCorrect,
      },
    ]);

    setTimeout(() => {
      if (activeScales.length > 0) generateQuestion();
    }, 1500);
  }

  function play() {
    if (currentQuestion && currentSampler) {
      playQuestionSound(
        currentQuestion.root,
        currentQuestion.scaleType,
        currentQuestion.degreeNote,
        currentSampler,
        currentQuestion.correctDegree
      );
    }
  }

  const quizState: QuizState = {
    qn: "Reconocimiento de Grados de Escala",
    config: {
      activeScales,
      activeDegrees,
      keepSameScale,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      r: currentQuestion?.root,
      st: currentQuestion?.scaleType,
      dn: currentQuestion?.degreeNote,
      cd: currentQuestion?.correctDegree,
    },
  };

  return (
    <div>
      <div className="mb-8">
        <NavButton to="/" name="Menú Principal" />
      </div>
      <UIContainer>
        <SectionHeader title="Reconocimiento de Grados de Escala" />
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
          <div className="flex flex-col items-center">
            <PlayButton
              currentSampler={currentSampler}
              isLoading={isLoading}
              isAnswering={isAnswering}
              text="Reproducir Grado"
              play={play}
            />

            <Feedback
              text={
                currentQuestion
                  ? `Escala: ${currentQuestion.root} ${
                      DIATONIC_SCALES_MAP[currentQuestion.scaleType] ||
                      currentQuestion.scaleType
                    }. ¿Qué grado escuchas?`
                  : "Selecciona una escala para empezar"
              }
              feedback={feedback}
            />

            {activeScales.length > 0 &&
            activeDegrees.length > 1 &&
            currentQuestion ? (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-8 w-full max-w-2xl">
                {ALL_DEGREES.map((degree) => (
                  <QuizOptionButton
                    key={degree}
                    isActive={activeDegrees.includes(degree)}
                    isAnswering={isAnswering}
                    option={degree}
                    handleAnswer={() => handleAnswer(parseInt(degree, 10))}
                  />
                ))}
              </div>
            ) : (
              <p className="text-red-500 h-24">
                Por favor, selecciona al menos una escala y dos grados en la
                configuración para comenzar.
              </p>
            )}

            <Stats
              totalQuestions={totalQuestions}
              correctAnswers={correctAnswers}
              wrongAnswers={wrongAnswers}
            />
            <ShareButton quizState={quizState} disabled={answerLog.length === 0} />
          </div>
        </div>
      </UIContainer>

      <SidePanel
        text="Configuración"
        showPanel={showSettings}
        setShowPanel={setShowSettings}
      >
        <InstrumentSelector
          currentInstrumentId={currentInstrumentId}
          changeInstrument={changeInstrument}
          isLoading={isLoading}
          availableInstrumentConfigs={availableInstrumentConfigs}
        />

        <OptionSelector
          title="Escalas Diatónicas (7 grados)"
          options={ALL_DIATONIC_SCALES.map((scale) => DIATONIC_SCALES_MAP[scale])}
          activeOptions={activeScales.map(
            (scale) => DIATONIC_SCALES_MAP[scale]
          )}
          toggleOption={(spanishName) => {
            const englishKey = Object.keys(DIATONIC_SCALES_MAP).find(
              (key) => DIATONIC_SCALES_MAP[key] === spanishName
            );
            if (englishKey) {
              toggleScale(englishKey);
            }
          }}
        />
        <OptionSelector
          title="Grados de la Escala"
          options={ALL_DEGREES}
          activeOptions={activeDegrees}
          toggleOption={toggleDegree}
        />
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Modo de Práctica
          </h3>
          <label className="flex items-center space-x-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={keepSameScale}
              onChange={(e) => setKeepSameScale(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Mantener la misma escala</span>
          </label>
        </div>
      </SidePanel>

      <SidePanel
        text="Historial de Respuestas"
        showPanel={showHistory}
        setShowPanel={setShowHistory}
      >
        <AnswerHistory answerLog={answerLog} />
      </SidePanel>

      {(showSettings || showHistory) && (
        <Overlay
          setShowHistory={setShowHistory}
          setShowSettings={setShowSettings}
        />
      )}
    </div>
  );
}