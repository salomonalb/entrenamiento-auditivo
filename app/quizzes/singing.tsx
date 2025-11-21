import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Range, Chord, Scale } from 'tonal';
import * as Tone from 'tone';
import { shuffle } from '~/utils/shuffle';
import NavButton from '~/components/NavButton';
import SectionHeader from '~/components/sectionHeader';
import UIContainer from '~/components/UIContainer';
import Feedback from '~/components/Feedback';
import Stats from '~/components/Stats';
import Pitchfinder from 'pitchfinder';
import { useInstrument } from '~/hooks/useInstrument';
import SidePanel from '~/components/SidePanel';
import Overlay from '~/components/Overlay';
import Cog from '~/components/Cog';
import Clock from '~/components/Clock';
import CircleButton from '~/components/CircleButton';
import PlayButton from '~/components/PlayButton';
import MicButton from '~/components/MicButton';
import AnswerHistory from '~/components/AnswerHistory';
import OptionSelector from '~/components/OptionsSelector';
import InstrumentSelector from '~/components/InstrumentSelector';
import { type QuizState } from "~/utils/urlState";
import ShareButton from "~/components/ShareButton";
import { QuestionGenerator } from '~/utils/questionGenerator';

const ALL_NOTES = Range.chromatic(['E2', 'C5'], { sharps: false });
const ALL_INTERVALS = [
  "2m", "2M", "3m", "3M", "4P", "5d", "5P", "6m", "6M", "7m", "7M", "8P",
];
const DIRECTIONS_MAP: Record<string, string> = {
  up: "Ascendente",
  down: "Descendente",
};
const ALL_DIRECTIONS = Object.keys(DIRECTIONS_MAP);

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

const ALL_CHORD_QUALITIES = ["maj", "min", "aug", "dim", "maj7", "min7", "7", "m7b5"];
const ALL_INVERSIONS = ["fund", "1ra", "2da", "3ra"];
const ORDINAL_WORDS = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena'];

function findMode(arr: string[]) {
  if (arr.length === 0) return null;
  const counts: { [key: string]: number } = {};
  let maxCount = 0;
  let mode = arr[0];

  for (const element of arr) {
    counts[element] = (counts[element] || 0) + 1;
    if (counts[element] > maxCount) {
      maxCount = counts[element];
      mode = element;
    }
  }
  return mode;
}

const ENHARMONIC_MAP: Record<string, string> = {
  'C#': 'C# / Db', 'Db': 'C# / Db',
  'D#': 'D# / Eb', 'Eb': 'D# / Eb',
  'F#': 'F# / Gb', 'Gb': 'F# / Gb',
  'G#': 'G# / Ab', 'Ab': 'G# / Ab',
  'A#': 'A# / Bb', 'Bb': 'A# / Bb',
};

function formatNoteWithMap(noteName: string): string {
  if (!noteName) return '';
  const noteDetails = Note.get(noteName);
  if (!noteDetails || noteDetails.empty) return noteName;

  const pc = noteDetails.pc;
  const octave = noteDetails.oct;

  if (pc && ENHARMONIC_MAP[pc]) {
    return `${ENHARMONIC_MAP[pc]}${octave !== undefined ? octave : ''}`;
  }
  return noteName;
}

export default function SingingQuiz() {
  const [targetNote, setTargetNote] = useState('');
  const [detectedNote, setDetectedNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [answerLog, setAnswerLog] = useState<{ correct: string; user: string; isCorrect: boolean }[]>([]);
  
  const [lowestNote, setLowestNote] = useState('E2');
  const [rangeSize, setRangeSize] = useState(24);

  const [minNote, setMinNote] = useState('E2');
  const [maxNote, setMaxNote] = useState('E4');
  const [availableLowestNotes, setAvailableLowestNotes] = useState<string[]>([]);
  const [isAnswering, setIsAnswering] = useState(true);

  const [askForIntervalSequence, setAskForIntervalSequence] = useState(false);
  const [askForChordSequence, setAskForChordSequence] = useState(false);
  const [askForScaleSequence, setAskForScaleSequence] = useState(false);

  const [activeIntervalQualities, setActiveIntervalQualities] = useState(['3M', '5P']);
  const [activeDirections, setActiveDirections] = useState(['up']);
  
  const [activeChordQualities, setActiveChordQualities] = useState(['maj', 'min']);
  const [activeChordInversions, setActiveChordInversions] = useState(['fund']);
  const [activeChordDirections, setActiveChordDirections] = useState(['up']);

  const [activeScaleTypes, setActiveScaleTypes] = useState(['major', 'minor']);
  const [activeScaleDirections, setActiveScaleDirections] = useState(['up']);
  
  const [targetNotes, setTargetNotes] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [sungNotes, setSungNotes] = useState<string[]>([]);
  const [currentIntervalInfo, setCurrentIntervalInfo] = useState<{ quality: string, direction: string } | null>(null);
  const [currentChordInfo, setCurrentChordInfo] = useState<{ quality: string, inversion: string, direction: string } | null>(null);
  const [currentScaleInfo, setCurrentScaleInfo] = useState<{ type: string, direction: string } | null>(null);

  const {
    currentInstrumentId,
    currentSampler,
    isLoading,
    changeInstrument,
    availableInstrumentConfigs,
  } = useInstrument();
  const currentInstrumentName =
    availableInstrumentConfigs[currentInstrumentId]?.name ||
    currentInstrumentId;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const pitchHistoryRef = useRef<string[]>([]);
  const isInitialMount = useRef(true);

  const notesInRange = Range.chromatic([minNote, maxNote], { sharps: false });

  const notesInRangeGenerator = useRef(new QuestionGenerator(notesInRange));
  const intervalQualityGenerator = useRef(new QuestionGenerator(activeIntervalQualities));
  const intervalDirectionGenerator = useRef(new QuestionGenerator(activeDirections));
  const chordQualityGenerator = useRef(new QuestionGenerator(activeChordQualities));
  const chordInversionGenerator = useRef(new QuestionGenerator(activeChordInversions));
  const chordDirectionGenerator = useRef(new QuestionGenerator(activeChordDirections));
  const scaleTypeGenerator = useRef(new QuestionGenerator(activeScaleTypes));
  const scaleDirectionGenerator = useRef(new QuestionGenerator(activeScaleDirections));

  useEffect(() => {
    notesInRangeGenerator.current.updateOptions(notesInRange);
  }, [notesInRange]);

  useEffect(() => {
    intervalQualityGenerator.current.updateOptions(activeIntervalQualities);
  }, [activeIntervalQualities]);

  useEffect(() => {
    intervalDirectionGenerator.current.updateOptions(activeDirections);
  }, [activeDirections]);

  useEffect(() => {
    chordQualityGenerator.current.updateOptions(activeChordQualities);
  }, [activeChordQualities]);

  useEffect(() => {
    chordInversionGenerator.current.updateOptions(activeChordInversions);
  }, [activeChordInversions]);

  useEffect(() => {
    chordDirectionGenerator.current.updateOptions(activeChordDirections);
  }, [activeChordDirections]);

  useEffect(() => {
    scaleTypeGenerator.current.updateOptions(activeScaleTypes);
  }, [activeScaleTypes]);

  useEffect(() => {
    scaleDirectionGenerator.current.updateOptions(activeScaleDirections);
  }, [activeScaleDirections]);

  useEffect(() => {
    const maxSafeMidi = Note.midi('C5')!;
    const filteredNotes = ALL_NOTES.filter(note => {
      const noteMidi = Note.midi(note)!;
      return noteMidi + rangeSize <= maxSafeMidi;
    });
    setAvailableLowestNotes(filteredNotes);

    if (!filteredNotes.includes(lowestNote)) {
      setLowestNote(filteredNotes[0]);
    }
  }, [rangeSize, lowestNote]);

  useEffect(() => {
    const lowestMidi = Note.midi(lowestNote);
    if (lowestMidi === null) return;

    const maxMidi = lowestMidi + rangeSize;
    
    setMinNote(lowestNote);
    setMaxNote(Note.fromMidi(maxMidi, { sharps: false }));

  }, [lowestNote, rangeSize]);


  const resetStats = useCallback(() => {
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setAnswerLog([]);
    setFeedback(null);
  }, []);

  const playNote = useCallback(
    (note: string) => {
      if (currentSampler) {
        const transport = Tone.getTransport();
        transport.stop();
        transport.cancel();
        transport.scheduleOnce((time) => {
          if (currentSampler) {
            currentSampler.triggerAttackRelease(note, "2n", time);
          }
        }, 0);
        transport.start();
      }
    },
    [currentSampler]
  );

  const playSequence = useCallback((notes: string[]) => {
    if (!currentSampler || notes.length === 0) return;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    notes.forEach((note, index) => {
      transport.scheduleOnce((time) => {
        if (currentSampler) {
          currentSampler.triggerAttackRelease(note, "4n", time);
        }
      }, index * 0.6);
    });
    transport.start();
  }, [currentSampler]);

  const generateQuestion = useCallback(() => {
    setIsAnswering(true);
    setDetectedNote('');
    setFeedback(null);
    setSungNotes([]);
    setCurrentIntervalInfo(null);
    setCurrentChordInfo(null);
    setCurrentScaleInfo(null);

    const maxMidi = Note.midi(maxNote)!;
    const minMidi = Note.midi(minNote)!;

    if (askForIntervalSequence) {
      if (activeIntervalQualities.length < 1 || activeDirections.length < 1) {
        setFeedback("Selecciona al menos un intervalo y una dirección.");
        setIsAnswering(false);
        return;
      }

      let validNotes: string[] = [];
      let quality = '', direction = '';
      let attempts = 0;

      while (attempts < 50) {
        const root = notesInRangeGenerator.current.getNext();
        quality = intervalQualityGenerator.current.getNext();
        direction = intervalDirectionGenerator.current.getNext();
        const interval = direction === 'up' ? quality : `-${quality}`;
        const secondNote = Note.transpose(root, interval);

        let notes = [root, secondNote].map(n => Note.simplify(n));
        let notesMidi = notes.map(n => Note.midi(n)!);

        while (notesMidi.some(m => m > maxMidi)) {
          notes = notes.map(n => Note.transpose(n, '-8P'));
          notesMidi = notes.map(n => Note.midi(n)!);
        }

        if (notesMidi.every(m => m >= minMidi)) {
          validNotes = notes;
          break;
        }
        attempts++;
      }

      if (validNotes.length > 0) {
        setTargetNotes(validNotes);
        setCurrentStep(0);
        setCurrentIntervalInfo({ quality, direction });
        if (currentSampler) {
          playSequence(validNotes);
        }
      } else {
        setFeedback("No se pueden formar los intervalos en el rango vocal actual. Intenta con un rango más amplio.");
        setIsAnswering(false);
      }
    } else if (askForChordSequence) {
      if (activeChordQualities.length < 1 || activeChordInversions.length < 1 || activeChordDirections.length < 1) {
        setFeedback("Selecciona al menos un tipo de acorde, una inversión y una dirección.");
        setIsAnswering(false);
        return;
      }

      let validNotes: string[] = [];
      let quality = '', inversion = '', direction = '';
      let attempts = 0;

      while (attempts < 50) {
        const root = notesInRangeGenerator.current.getNext();
        quality = chordQualityGenerator.current.getNext();
        inversion = chordInversionGenerator.current.getNext();
        direction = chordDirectionGenerator.current.getNext();
        
        const chordNotes = Chord.notes(quality, root);
        if (chordNotes.length === 0) {
          attempts++;
          continue;
        }

        let inversionNotes = [...chordNotes];
        if (inversion === "1ra") inversionNotes = [...chordNotes.slice(1), Note.transpose(chordNotes[0], "8P")];
        if (inversion === "2da") inversionNotes = [...chordNotes.slice(2), Note.transpose(chordNotes[0], "8P"), Note.transpose(chordNotes[1], "8P")];
        if (inversion === "3ra" && chordNotes.length > 3) inversionNotes = [...chordNotes.slice(3), Note.transpose(chordNotes[0], "8P"), Note.transpose(chordNotes[1], "8P"), Note.transpose(chordNotes[2], "8P")];

        let notes = inversionNotes.map(n => Note.simplify(n));

        if (direction === 'down') {
          notes.reverse();
        }

        let notesMidi = notes.map(n => Note.midi(n)!);

        while (notesMidi.some(m => m > maxMidi)) {
          notes = notes.map(n => Note.transpose(n, '-8P'));
          notesMidi = notes.map(n => Note.midi(n)!);
        }

        if (notesMidi.every(m => m >= minMidi)) {
          validNotes = notes;
          break;
        }
        attempts++;
      }

      if (validNotes.length > 0) {
        setTargetNotes(validNotes);
        setCurrentStep(0);
        setCurrentChordInfo({ quality, inversion, direction });
        if (currentSampler) {
          playSequence(validNotes);
        }
      } else {
        setFeedback("No se pueden formar acordes en el rango vocal actual. Intenta con un rango más amplio.");
        setIsAnswering(false);
      }
    } else if (askForScaleSequence) {
      if (activeScaleTypes.length < 1 || activeScaleDirections.length < 1) {
        setFeedback("Selecciona al menos un tipo de escala y una dirección.");
        setIsAnswering(false);
        return;
      }

      let validNotes: string[] = [];
      let type = '', direction = '';
      let attempts = 0;

      while (attempts < 50) {
        const root = notesInRangeGenerator.current.getNext();
        type = scaleTypeGenerator.current.getNext();
        direction = scaleDirectionGenerator.current.getNext();
        
        const scaleData = Scale.get(`${root} ${type}`);
        if (scaleData.notes.length === 0) {
          attempts++;
          continue;
        }

        let scaleNotesWithOctave = [...scaleData.notes];
        if (scaleNotesWithOctave.length > 0) {
          const rootNote = scaleNotesWithOctave[0];
          const pc = rootNote.slice(0, -1);
          const oct = parseInt(rootNote.slice(-1), 10);
          if (!isNaN(oct)) {
            const octaveNote = `${pc}${oct + 1}`; // Add octave to the last note
            scaleNotesWithOctave.push(octaveNote);
          }
        }

        let notes = scaleNotesWithOctave.map(n => Note.simplify(n));

        if (direction === 'down') {
          notes.reverse();
        }

        let notesMidi = notes.map(n => Note.midi(n)!);

        while (notesMidi.some(m => m > maxMidi)) {
          notes = notes.map(n => Note.transpose(n, '-8P'));
          notesMidi = notes.map(n => Note.midi(n)!);
        }
        
        while (notesMidi.some(m => m < minMidi)) {
          notes = notes.map(n => Note.transpose(n, '8P'));
          notesMidi = notes.map(n => Note.midi(n)!);
        }

        if (notesMidi.every(m => m >= minMidi && m <= maxMidi)) {
          validNotes = notes;
          break;
        }
        attempts++;
      }

      if (validNotes.length > 0) {
        setTargetNotes(validNotes);
        setCurrentStep(0);
        setCurrentScaleInfo({ type, direction });
        if (currentSampler) {
          playSequence(validNotes);
        }
      } else {
        setFeedback("No se pueden formar escalas en el rango vocal actual. Intenta con un rango más amplio.");
        setIsAnswering(false);
      }
    } else {
      const note = notesInRangeGenerator.current.getNext();
      setTargetNote(note);
      if (currentSampler) {
        playNote(note);
      }
    }
  }, [minNote, maxNote, playNote, currentSampler, askForIntervalSequence, activeIntervalQualities, activeDirections, playSequence, askForChordSequence, activeChordQualities, activeChordInversions, activeChordDirections, askForScaleSequence, activeScaleTypes, activeScaleDirections]);

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
  }, [minNote, maxNote, resetStats, generateQuestion, currentSampler, askForIntervalSequence, activeIntervalQualities, activeDirections, askForChordSequence, activeChordQualities, activeChordInversions, activeChordDirections, askForScaleSequence, activeScaleTypes, activeScaleDirections]);

  const stopRecordingAndEvaluate = useCallback(() => {
    setIsAnswering(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsRecording(false);

    const mostCommonPitch = findMode(pitchHistoryRef.current);

    if (!mostCommonPitch) {
      setFeedback('No se detectó un tono claro. Inténtalo de nuevo.');
      setTimeout(() => setFeedback(''), 3000);
      setIsAnswering(true);
      return;
    }

    setDetectedNote(mostCommonPitch);
    const newSungNotes = [...sungNotes, mostCommonPitch];
    setSungNotes(newSungNotes);

    const sequenceMode = askForIntervalSequence || askForChordSequence || askForScaleSequence;

    if (sequenceMode) {
      const currentTargetNote = targetNotes[currentStep];
      const isCorrect = Note.midi(mostCommonPitch) === Note.midi(currentTargetNote);

      if (isCorrect) {
        if (currentStep === targetNotes.length - 1) {
          setCorrectAnswers(prev => prev + 1);
          let feedbackText = "✅ Correcto!";
          if (askForIntervalSequence && currentIntervalInfo) {
            const dirText = DIRECTIONS_MAP[currentIntervalInfo.direction];
            feedbackText = `✅ Correcto! (${currentIntervalInfo.quality} ${dirText})`;
          } else if (askForChordSequence && currentChordInfo) {
            const dirText = DIRECTIONS_MAP[currentChordInfo.direction];
            feedbackText = `✅ Correcto! (${currentChordInfo.quality} ${currentChordInfo.inversion} ${dirText})`;
          } else if (askForScaleSequence && currentScaleInfo) {
            const dirText = DIRECTIONS_MAP[currentScaleInfo.direction];
            feedbackText = `✅ Correcto! (${COMMON_SCALES_MAP[currentScaleInfo.type]} ${dirText})`;
          }
          setFeedback(feedbackText);
          setAnswerLog(prev => [...prev, { correct: targetNotes.join(' - '), user: newSungNotes.join(' - '), isCorrect: true }]);
          setTotalQuestions(prev => prev + 1);
          setTimeout(generateQuestion, 2000);
        } else {
          setCurrentStep(prev => prev + 1);
          let feedbackText = `✅ ¡Bien! Ahora canta ${formatNoteWithMap(targetNotes[currentStep + 1])}`;
          if (askForChordSequence) {
            const ordinalWord = ORDINAL_WORDS[currentStep + 1];
            if (ordinalWord) {
              feedbackText = `✅ ¡Bien! Ahora canta la ${ordinalWord} nota del arpegio: ${formatNoteWithMap(targetNotes[currentStep + 1])}`;
            }
          } else if (askForScaleSequence) {
            const ordinalWord = ORDINAL_WORDS[currentStep + 1];
            if (ordinalWord) {
              feedbackText = `✅ ¡Bien! Ahora canta la ${ordinalWord} nota de la escala: ${formatNoteWithMap(targetNotes[currentStep + 1])}`;
            }
          }
          setFeedback(feedbackText);
          playSequence(targetNotes);
          setIsAnswering(true);
        }
      } else {
        setWrongAnswers(prev => prev + 1);
        setFeedback(`❌ Error! La nota era ${formatNoteWithMap(currentTargetNote)}`);
        setAnswerLog(prev => [...prev, { correct: targetNotes.join(' - '), user: newSungNotes.join(' - '), isCorrect: false }]);
        setTotalQuestions(prev => prev + 1);
        setTimeout(generateQuestion, 2000);
      }
    } else {
      const isCorrect = Note.midi(mostCommonPitch) === Note.midi(targetNote);
      setTotalQuestions(prev => prev + 1);
      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
        setFeedback('✅ Correcto!');
      } else {
        setWrongAnswers(prev => prev + 1);
        setFeedback(`❌ Error! era ${formatNoteWithMap(targetNote)}`);
      }
      setAnswerLog(prev => [...prev, { correct: targetNote, user: mostCommonPitch, isCorrect }]);
      setTimeout(generateQuestion, 2000);
    }
  }, [targetNote, generateQuestion, askForIntervalSequence, askForChordSequence, askForScaleSequence, targetNotes, currentStep, sungNotes, currentIntervalInfo, currentChordInfo, currentScaleInfo, playSequence]);

  const detectPitch = useCallback(() => {
    try {
      if (analyserRef.current && audioContextRef.current) {
        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);
        const detect = Pitchfinder.AMDF({ sampleRate: audioContextRef.current.sampleRate });
        const frequency = detect(buffer);

        if (frequency && (targetNote || targetNotes.length > 0)) {
          const note = Note.fromFreq(frequency);
          if (note) {
            pitchHistoryRef.current.push(note);
            setDetectedNote(note);
          }
        }
      }
    } catch (error) {
      // Silently catch errors
    }
    animationFrameId.current = requestAnimationFrame(detectPitch);
  }, [targetNote, targetNotes]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      setIsRecording(true);
      pitchHistoryRef.current = [];
      setDetectedNote('');
      animationFrameId.current = requestAnimationFrame(detectPitch);

      setTimeout(stopRecordingAndEvaluate, 3000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      setFeedback('Error al acceder al micrófono. Por favor, permite el acceso al micrófono.');
    }
  };

  const playTargetNote = () => {
    if (askForIntervalSequence || askForChordSequence) {
      if (targetNotes.length > 0) {
        playSequence(targetNotes);
      }
    }
    else if (targetNote) {
        playNote(targetNote);
      }
  };

  

  function toggleIntervalQuality(quality: string) {
    const isDeselecting = activeIntervalQualities.includes(quality);
    if (isDeselecting && activeIntervalQualities.length <= 1) {
      return;
    }
    setActiveIntervalQualities((prev) =>
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

  function toggleChordQuality(quality: string) {
    const isDeselecting = activeChordQualities.includes(quality);
    if (isDeselecting && activeChordQualities.length <= 1) {
      return;
    }
    setActiveChordQualities((prev) =>
      isDeselecting ? prev.filter((q) => q !== quality) : [...prev, quality]
    );
  }

  function toggleChordInversion(inversion: string) {
    const isDeselecting = activeChordInversions.includes(inversion);
    if (isDeselecting && activeChordInversions.length <= 1) {
      return;
    }
    setActiveChordInversions((prev) =>
      isDeselecting ? prev.filter((i) => i !== inversion) : [...prev, inversion]
    );
  }

  function toggleChordDirection(direction: string) {
    const isDeselecting = activeChordDirections.includes(direction);
    if (isDeselecting && activeChordDirections.length <= 1) {
      return;
    }
    setActiveChordDirections((prev) =>
      isDeselecting ? prev.filter((d) => d !== direction) : [...prev, direction]
    );
  }

  function toggleScaleType(type: string) {
    const isDeselecting = activeScaleTypes.includes(type);
    if (isDeselecting && activeScaleTypes.length <= 1) {
      return;
    }
    setActiveScaleTypes((prev) =>
      isDeselecting ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function toggleScaleDirection(direction: string) {
    const isDeselecting = activeScaleDirections.includes(direction);
    if (isDeselecting && activeScaleDirections.length <= 1) {
      return;
    }
    setActiveScaleDirections((prev) =>
      isDeselecting ? prev.filter((d) => d !== direction) : [...prev, direction]
    );
  }

  const instructionText = 
    askForIntervalSequence || askForChordSequence || askForScaleSequence
      ? targetNotes.length > 0
        ? askForScaleSequence && ORDINAL_WORDS[currentStep]
          ? `Canta la ${ORDINAL_WORDS[currentStep]} nota de la escala: ${formatNoteWithMap(
              targetNotes[currentStep]
            )}`
          : askForChordSequence && ORDINAL_WORDS[currentStep]
          ? `Canta la ${
              ORDINAL_WORDS[currentStep]
            } nota del arpegio: ${formatNoteWithMap(
              targetNotes[currentStep]
            )}`
          : `Canta la nota ${formatNoteWithMap(targetNotes[currentStep])}`
        : "Configurando..."
      : `Canta la nota ${formatNoteWithMap(targetNote)}`;

  const playAction = 
    askForIntervalSequence || askForChordSequence || askForScaleSequence
      ? () => playSequence(targetNotes)
      : playTargetNote;
  const buttonText = askForIntervalSequence
    ? "Reproducir Intervalo"
    : askForChordSequence
    ? "Reproducir Acorde"
    : askForScaleSequence
    ? "Reproducir Escala"
    : "Reproducir Nota";

  const quizState: QuizState = {
    qn: "Reconocimiento de Canto",
    config: {
      lowestNote,
      rangeSize,
      askForIntervalSequence,
      askForChordSequence,
      askForScaleSequence,
      activeIntervalQualities,
      activeDirections,
      activeChordQualities,
      activeChordInversions,
      activeChordDirections,
      activeScaleTypes,
      activeScaleDirections,
      instrumentName: currentInstrumentName,
    },
    t: totalQuestions,
    c: correctAnswers,
    w: wrongAnswers,
    log: answerLog.map((l) => ({ c: l.correct, u: l.user, i: l.isCorrect })),
    curr: {
      tn: targetNote,
      tns: targetNotes,
      cs: currentStep,
    },
  };

  return (
    <div>
      <div className="mb-8">
        <NavButton to="/" name="Menú Principal" />
      </div>
      <UIContainer>
        <SectionHeader title="Reconocimiento de Canto" />
        <div className="flex gap-2 justify-end my-4 px-2">
          <CircleButton showSidebar={showHistory} setShowSidebar={setShowHistory}>
            <Clock />
          </CircleButton>
          <CircleButton showSidebar={showSettings} setShowSidebar={setShowSettings}>
            <Cog />
          </CircleButton>
        </div>
        <div className="p-6 flex flex-col items-center">
          <PlayButton
            currentSampler={currentSampler}
            isLoading={isLoading}
            isAnswering={!isRecording && isAnswering}
            text={buttonText}
            play={playAction}
          />
          <Feedback text={instructionText} feedback={feedback} />
          
            <div className="py-3 px-6 rounded-lg text-xl font-bold text-center w-full max-w-md transition-all duration-200 bg-indigo-900/30 text-indigo-100 mb-4">
              {isRecording && <p>{detectedNote && `Estas cantando ${formatNoteWithMap(detectedNote)}` || "No estas Cantando" }</p>}
              {!isRecording && <p>&nbsp;</p>}
            </div>
        
          <MicButton
            isLoading={isLoading}
            isRecording={isRecording}
            text={isRecording ? "Escuchando..." : "Canta"}
            record={startRecording}
            disabled={!isAnswering || isRecording}
          />
          <Stats
            totalQuestions={totalQuestions}
            correctAnswers={correctAnswers}
            wrongAnswers={wrongAnswers}
          />
          <ShareButton quizState={quizState} disabled={answerLog.length === 0} />
        </div>
      </UIContainer>
      <SidePanel text="Configuración" showPanel={showSettings} setShowPanel={setShowSettings}>
        <InstrumentSelector
          currentInstrumentId={currentInstrumentId}
          changeInstrument={changeInstrument}
          isLoading={isLoading}
          availableInstrumentConfigs={availableInstrumentConfigs}
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2 text-white">Rango Vocal</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-white block mb-1">Rango</label>
              <div className="flex gap-2">
                <button onClick={() => setRangeSize(12)} className={`flex-1 p-2 rounded ${rangeSize === 12 ? 'bg-blue-600' : 'bg-gray-700'}`}>1 Octava</button>
                <button onClick={() => setRangeSize(18)} className={`flex-1 p-2 rounded ${rangeSize === 18 ? 'bg-blue-600' : 'bg-gray-700'}`}>1.5 Octavas</button>
                <button onClick={() => setRangeSize(24)} className={`flex-1 p-2 rounded ${rangeSize === 24 ? 'bg-blue-600' : 'bg-gray-700'}`}>2 Octavas</button>
              </div>
            </div>
            <div>
              <label className="text-white block mb-1">Nota Más Grave</label>
              <select value={lowestNote} onChange={(e) => setLowestNote(e.target.value)} className="bg-gray-800 text-white p-2 rounded w-full">
                {availableLowestNotes.map(note => <option key={note} value={note}>{formatNoteWithMap(note)}</option>)} 
              </select>
            </div>
            <div className='text-center text-white/80'>
              <p>Rango Calculado: {formatNoteWithMap(minNote)} - {formatNoteWithMap(maxNote)}</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Modo de Pregunta
          </h3>
          <label className="flex items-center space-x-2 text-white cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={askForIntervalSequence}
              onChange={(e) => {
                setAskForIntervalSequence(e.target.checked);
                if (e.target.checked) {
                  setAskForChordSequence(false);
                  setAskForScaleSequence(false);
                }
              }}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Cantar Secuencia de Intervalo</span>
          </label>
          <label className="flex items-center space-x-2 text-white cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={askForChordSequence}
              onChange={(e) => {
                setAskForChordSequence(e.target.checked);
                if (e.target.checked) {
                  setAskForIntervalSequence(false);
                  setAskForScaleSequence(false);
                }
              }}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Cantar Secuencia de Acorde</span>
          </label>
          <label className="flex items-center space-x-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={askForScaleSequence}
              onChange={(e) => {
                setAskForScaleSequence(e.target.checked);
                if (e.target.checked) {
                  setAskForIntervalSequence(false);
                  setAskForChordSequence(false);
                }
              }}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Cantar Secuencia de Escala</span>
          </label>
        </div>

        {askForIntervalSequence && (
          <>
            <OptionSelector
              title="Tipos de Intervalos"
              options={ALL_INTERVALS}
              activeOptions={activeIntervalQualities}
              toggleOption={toggleIntervalQuality}
            />
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
          </>
        )}

        {askForChordSequence && (
          <>
            <OptionSelector
              title="Tipos de Acordes"
              options={ALL_CHORD_QUALITIES}
              activeOptions={activeChordQualities}
              toggleOption={toggleChordQuality}
            />
            <OptionSelector
              title="Inversión del Acorde"
              options={ALL_INVERSIONS}
              activeOptions={activeChordInversions}
              toggleOption={toggleChordInversion}
            />
            <OptionSelector
              title="Dirección del Acorde"
              options={ALL_DIRECTIONS.map((dir) => DIRECTIONS_MAP[dir])}
              activeOptions={activeChordDirections.map((dir) => DIRECTIONS_MAP[dir])}
              toggleOption={(spanishName) => {
                const englishKey = Object.keys(DIRECTIONS_MAP).find(
                  (key) => DIRECTIONS_MAP[key] === spanishName
                );
                if (englishKey) {
                  toggleChordDirection(englishKey);
                }
              }}
            />
          </>
        )}

        {askForScaleSequence && (
          <>
            <OptionSelector
              title="Tipos de Escalas"
              options={ALL_SCALES.map((scale) => COMMON_SCALES_MAP[scale])}
              activeOptions={activeScaleTypes.map(
                (scale) => COMMON_SCALES_MAP[scale]
              )}
              toggleOption={(spanishName) => {
                const englishKey = Object.keys(COMMON_SCALES_MAP).find(
                  (key) => COMMON_SCALES_MAP[key] === spanishName
                );
                if (englishKey) {
                  toggleScaleType(englishKey);
                }
              }}
            />
            <OptionSelector
              title="Dirección de la Escala"
              options={ALL_DIRECTIONS.map((dir) => DIRECTIONS_MAP[dir])}
              activeOptions={activeScaleDirections.map((dir) => DIRECTIONS_MAP[dir])}
              toggleOption={(spanishName) => {
                const englishKey = Object.keys(DIRECTIONS_MAP).find(
                  (key) => DIRECTIONS_MAP[key] === spanishName
                );
                if (englishKey) {
                  toggleScaleDirection(englishKey);
                }
              }}
            />
          </>
        )}
      </SidePanel>
      <SidePanel text="Historial de Respuestas" showPanel={showHistory} setShowPanel={setShowHistory}>
        <AnswerHistory answerLog={answerLog.map(log => ({
          ...log,
          correct: log.correct.split(' - ').map(formatNoteWithMap).join(' - '),
          user: log.user.split(' - ').map(formatNoteWithMap).join(' - '),
        }))} />
      </SidePanel>
      {(showSettings || showHistory) && (
        <Overlay setShowHistory={setShowHistory} setShowSettings={setShowSettings} />
      )}
    </div>
  );
}