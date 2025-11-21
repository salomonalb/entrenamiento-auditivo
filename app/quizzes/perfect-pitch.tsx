import React, { useState, useEffect, useRef, useCallback } from "react";
import { Note, Range } from "tonal";
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

// Define possible notes and octaves
const ALL_NOTES_PC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ALL_OCTAVES = [2, 3, 4];

export default function PerfectPitchQuiz() {
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

  const [targetNote, setTargetNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(true);
  const [activeNotes, setActiveNotes] = useState<string[]>(ALL_NOTES_PC);
  const [activeOctaves, setActiveOctaves] = useState<number[]>([3]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [askForOctave, setAskForOctave] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  // Stats tracking
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [answerLog, setAnswerLog] = useState<
    { correct: string; user: string; isCorrect: boolean }[]
  >([]);

  // Use useRef to hold the question generator instances
  const noteGenerator = useRef(new QuestionGenerator(activeNotes));
  const octaveGenerator = useRef(new QuestionGenerator(activeOctaves));

  // Update generators when options change
  useEffect(() => {
    noteGenerator.current.updateOptions(activeNotes);
  }, [activeNotes]);

  useEffect(() => {
    octaveGenerator.current.updateOptions(activeOctaves);
  }, [activeOctaves]);

  const resetStats = useCallback(() => {
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setAnswerLog([]);
    setFeedback(null);
  }, []);

  const playQuestionSequence = useCallback(
    (note: string) => {
      if (!currentSampler) return;
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();

      // 1. Reference sequence
      const referenceNotes = Range.chromatic(["C3", "B3"], { sharps: true });
      const shuffledNotes = shuffle(referenceNotes);

      let currentTime = 0;
      shuffledNotes.forEach((refNote) => {
        transport.scheduleOnce((time) => {
          currentSampler.triggerAttackRelease(refNote, "8n", time);
        }, currentTime);
        currentTime += 0.25; // 8n duration at 120bpm
      });

      // 2. Pause (4 * 8n = 2n)
      currentTime += 0.25 * 4;

      // 3. Question note
      transport.scheduleOnce((time) => {
        currentSampler.triggerAttackRelease(note, "2n", time);
      }, currentTime);

      transport.start();
    },
    [currentSampler]
  );

  const generateQuestion = useCallback(() => {
    if (activeNotes.length < 1 || activeOctaves.length < 1) return;

    const notePc = noteGenerator.current.getNext();
    const octave = octaveGenerator.current.getNext();
    const note = `${notePc}${octave}`;

    setTargetNote(note);
    setFeedback(null);
    setIsAnswering(true);
    setSelectedNote(null);
    playQuestionSequence(note);
  }, [activeNotes, activeOctaves, playQuestionSequence]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (currentSampler) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        // The first question will be played automatically
        generateQuestion();
      } else {
        resetStats();
        generateQuestion();
      }
    }
  }, [currentSampler, activeNotes, activeOctaves, askForOctave, resetStats, generateQuestion]);

  function toggleNote(note: string) {
    setActiveNotes((prev) => {
      const isDeselecting = prev.includes(note);
      if (isDeselecting && prev.length <= 2) {
        return prev; // Prevent deselection
      }
      return isDeselecting ? prev.filter((n) => n !== note) : [...prev, note];
    });
  }

  function toggleOctave(octave: number) {
    setActiveOctaves((prev) => {
      const isDeselecting = prev.includes(octave);
      const minOctaves = askForOctave ? 2 : 1;
      if (isDeselecting && prev.length <= minOctaves) {
        return prev; // Prevent deselection
      }
      return isDeselecting ? prev.filter((o) => o !== octave) : [...prev, octave];
    });
  }

  function handleAskForOctaveChange(checked: boolean) {
    setAskForOctave(checked);
    if (checked) {
      // When turning it on
      setActiveOctaves((prev) => {
        if (prev.length < 2) {
          // Not enough octaves active, so add 2 and 3
          const newOctaves = new Set([...prev, 2, 3]);
          return Array.from(newOctaves).filter((o) => ALL_OCTAVES.includes(o));
        }
        return prev;
      });
    }
  }

  function handleAnswer(selected: string) {
    if (!isAnswering) return;

    if (askForOctave) {
      setSelectedNote(selected);
    } else {
      setIsAnswering(false);
      setTotalQuestions((prev) => prev + 1);

      const isCorrect = Note.pitchClass(selected) === Note.pitchClass(targetNote);
      if (isCorrect) {
        setCorrectAnswers((prev) => prev + 1);
        setFeedback("✅ Correcto!");
      } else {
        setWrongAnswers((prev) => prev + 1);
        setFeedback(`❌ Error! era ${Note.pitchClass(targetNote)}`);
      }

      setAnswerLog((prev) => [
        ...prev,
        { correct: Note.pitchClass(targetNote), user: selected, isCorrect },
      ]);

      setTimeout(generateQuestion, 1500);
    }
  }

  function handleOctaveAnswer(selectedOctave: number) {
    if (!isAnswering || !selectedNote) return;

    setIsAnswering(false);
    setTotalQuestions((prev) => prev + 1);

    const noteIsCorrect = Note.pitchClass(selectedNote) === Note.pitchClass(targetNote);
    const octaveIsCorrect = selectedOctave === Note.octave(targetNote);
    const isCorrect = noteIsCorrect && octaveIsCorrect;

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setFeedback("✅ Correcto!");
    } else {
      setWrongAnswers((prev) => prev + 1);
      setFeedback(`❌ Error! era ${targetNote}`);
    }

    setAnswerLog((prev) => [
      ...prev,
      {
        correct: targetNote,
        user: `${selectedNote}${selectedOctave}`,
        isCorrect,
      },
    ]);

    setTimeout(generateQuestion, 1500);
  }

  const quizState: QuizState = {
    qn: "Oído Absoluto",
    config: {
      activeNotes,
      activeOctaves,
      askForOctave,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      tn: targetNote,
    },
  };

  return (
    <div>
      <div className="mb-8">
        <NavButton to="/" name="Menú Principal" />
      </div>
      <UIContainer>
        <SectionHeader title="Oído Absoluto" />
        <div className="flex gap-2 justify-end my-4 px-2">
          <CircleButton showSidebar={showHistory} setShowSidebar={setShowHistory}>
            <Clock />
          </CircleButton>
          <CircleButton showSidebar={showSettings} setShowSidebar={setShowSettings}>
            <Cog />
          </CircleButton>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center">
            <div className="flex gap-4 mb-4">
                <PlayButton
                  currentSampler={currentSampler}
                  isLoading={isLoading}
                  isAnswering={isAnswering}
                  text="Tocar Pregunta"
                  play={() => playQuestionSequence(targetNote)}
                />
            </div>

            <Feedback
              text={
                askForOctave
                  ? selectedNote
                    ? "Paso 2: Selecciona la octava"
                    : "Paso 1: Selecciona la nota"
                  : "Selecciona la nota que escuchas"
              }
              feedback={feedback}
            />

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-8 w-full max-w-2xl">
              {ALL_NOTES_PC.map((option) => (
                <QuizOptionButton
                  key={option}
                  isActive={activeNotes.includes(option)}
                  isAnswering={isAnswering}
                  option={option}
                  handleAnswer={handleAnswer}
                  isSelected={selectedNote === option}
                />
              ))}
            </div>

            {askForOctave && (
              <div className="w-full max-w-2xl text-center flex flex-col items-center">
                <div className="grid grid-cols-3 gap-3 mb-8 w-1/2">
                  {ALL_OCTAVES.map((option) => (
                    <QuizOptionButton
                      key={option}
                      isActive={true}
                      isAnswering={isAnswering && selectedNote !== null}
                      option={String(option)}
                      handleAnswer={(oct) => handleOctaveAnswer(Number(oct))}
                    />
                  ))}
                </div>
              </div>
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
          title="Notas"
          options={ALL_NOTES_PC}
          activeOptions={activeNotes}
          toggleOption={toggleNote}
        />
        <OptionSelector
          title="Octavas"
          options={ALL_OCTAVES.map(String)}
          activeOptions={activeOctaves.map(String)}
          toggleOption={(oct) => toggleOctave(Number(oct))}
        />
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Pregunta de Octava
          </h3>
          <label className="flex items-center space-x-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={askForOctave}
              onChange={(e) => handleAskForOctaveChange(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Activar pregunta de octava</span>
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