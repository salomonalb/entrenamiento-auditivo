import React, { useMemo } from "react";
import { useSearchParams } from "react-router";
import { decodeQuizState } from "~/utils/urlState";
import NavButton from "~/components/NavButton";
import UIContainer from "~/components/UIContainer";
import SectionHeader from "~/components/sectionHeader";
import Stats from "~/components/Stats";
import AnswerHistory from "~/components/AnswerHistory";
import { Note } from "tonal";

const DIRECTIONS_MAP: Record<string, string> = {
  up: "Ascendente",
  down: "Descendente",
  harmonic: "Armónico",
};

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

export default function VerifyResult() {
  const [searchParams] = useSearchParams();

  const decodedState = useMemo(() => {
    const encodedState = searchParams.get("result");
    if (encodedState) {
      return decodeQuizState(encodedState);
    }
    return null;
  }, [searchParams]);

  if (!decodedState) {
    return (
      <div>
        <div className="mb-8">
          <NavButton to="/" name="Menú Principal" />
        </div>
        <UIContainer>
          <SectionHeader title="Resultado Inválido" />
          <div className="p-6 text-white">
            No se encontraron datos de resultado o son inválidos.
          </div>
        </UIContainer>
      </div>
    );
  }

  const { qn, config, t, c, w, log } = decodedState;

  const processedAnswerLog = useMemo(() => {
    if (qn === "Reconocimiento de Escalas" || qn === "Reconocimiento de Grados de Escala") {
      return log.map((l) => ({
        correct: COMMON_SCALES_MAP[l.c] || l.c,
        user: COMMON_SCALES_MAP[l.u] || l.u,
        isCorrect: l.i,
      }));
    }
    if (qn === "Reconocimiento de Canto") {
      return log.map((l) => ({
        correct: l.c.split(' - ').map(formatNoteWithMap).join(' - '),
        user: l.u.split(' - ').map(formatNoteWithMap).join(' - '),
        isCorrect: l.i,
      }));
    }
    return log.map((l) => ({
      correct: l.c,
      user: l.u,
      isCorrect: l.i,
    }));
  }, [log, qn]);

  const renderQuizConfig = () => {
    if (qn === "Reconocimiento de Intervalos") {
      return (
        <>
          {config.activeQualities?.length > 0 && (
            <p>
              <strong>Intervalos:</strong> {config.activeQualities.join(", ")}
            </p>
          )}
          {config.activeDirections?.length > 0 && (
            <p>
              <strong>Direcciones:</strong>{" "}
              {config.activeDirections
                .map((d: string) => DIRECTIONS_MAP[d] || d)
                .join(", ")}
            </p>
          )}
        </>
      );
    }

    if (qn === "Reconocimiento de Acordes") {
      return (
        <>
          {config.activeQualities?.length > 0 && (
            <p>
              <strong>Tipos de Acorde:</strong> {config.activeQualities.join(", ")}
            </p>
          )}
          {config.activeInversions?.length > 0 && (
            <p>
              <strong>Inversiones:</strong> {config.activeInversions.join(", ")}
            </p>
          )}
          {config.activeAccompaniments?.length > 0 && (
            <p>
              <strong>Acompañamiento:</strong> {config.activeAccompaniments.join(", ")}
            </p>
          )}
          {typeof config.askForInversion === 'boolean' && (
             <p>
                <strong>Preguntas de Inversión:</strong> {config.askForInversion ? "Activado" : "Desactivado"}
             </p>
          )}
        </>
      );
    }

    if (qn === "Reconocimiento de Escalas") {
      return (
        <>
          {config.activeScales?.length > 0 && (
            <p>
              <strong>Escalas:</strong> {config.activeScales.map((s: string) => COMMON_SCALES_MAP[s] || s).join(", ")}
            </p>
          )}
          {config.activeDirections?.length > 0 && (
            <p>
              <strong>Direcciones:</strong>{" "}
              {config.activeDirections
                .map((d: string) => DIRECTIONS_MAP[d] || d)
                .join(", ")}
            </p>
          )}
        </>
      );
    }

    if (qn === "Reconocimiento de Grados de Escala") {
      return (
        <>
          {config.activeScales?.length > 0 && (
            <p>
              <strong>Escalas:</strong> {config.activeScales.map((s: string) => COMMON_SCALES_MAP[s] || s).join(", ")}
            </p>
          )}
          {config.activeDegrees?.length > 0 && (
            <p>
              <strong>Grados:</strong> {config.activeDegrees.join(", ")}
            </p>
          )}
          {typeof config.keepSameScale === 'boolean' && (
             <p>
                <strong>Mantener misma escala:</strong> {config.keepSameScale ? "Activado" : "Desactivado"}
             </p>
          )}
        </>
      );
    }

    if (qn === "Oído Absoluto") {
      return (
        <>
          {config.activeNotes?.length > 0 && (
            <p>
              <strong>Notas:</strong> {config.activeNotes.join(", ")}
            </p>
          )}
          {config.activeOctaves?.length > 0 && (
            <p>
              <strong>Octavas:</strong> {config.activeOctaves.join(", ")}
            </p>
          )}
          {typeof config.askForOctave === 'boolean' && (
             <p>
                <strong>Pregunta de Octava:</strong> {config.askForOctave ? "Activado" : "Desactivado"}
             </p>
          )}
        </>
      );
    }

    if (qn === "Reconocimiento de Canto") {
      return (
        <>
          <p>
            <strong>Rango Vocal:</strong> {config.lowestNote} (Rango: {config.rangeSize} semitonos)
          </p>
          {config.askForIntervalSequence && (
            <>
              <p>
                <strong>Modo:</strong> Secuencia de Intervalo
              </p>
              {config.activeIntervalQualities?.length > 0 && (
                <p>
                  <strong>Intervalos Activos:</strong> {config.activeIntervalQualities.join(", ")}
                </p>
              )}
              {config.activeDirections?.length > 0 && (
                <p>
                  <strong>Direcciones Activas:</strong> {config.activeDirections.map((d: string) => DIRECTIONS_MAP[d] || d).join(", ")}
                </p>
              )}
            </>
          )}
          {config.askForChordSequence && (
            <>
              <p>
                <strong>Modo:</strong> Secuencia de Acorde
              </p>
              {config.activeChordQualities?.length > 0 && (
                <p>
                  <strong>Tipos de Acorde Activos:</strong> {config.activeChordQualities.join(", ")}
                </p>
              )}
              {config.activeChordInversions?.length > 0 && (
                <p>
                  <strong>Inversiones Activas:</strong> {config.activeChordInversions.join(", ")}
                </p>
              )}
              {config.activeChordDirections?.length > 0 && (
                <p>
                  <strong>Direcciones Activas:</strong> {config.activeChordDirections.map((d: string) => DIRECTIONS_MAP[d] || d).join(", ")}
                </p>
              )}
            </>
          )}
          {config.askForScaleSequence && (
            <>
              <p>
                <strong>Modo:</strong> Secuencia de Escala
              </p>
              {config.activeScaleTypes?.length > 0 && (
                <p>
                  <strong>Tipos de Escala Activos:</strong> {config.activeScaleTypes.map((s: string) => COMMON_SCALES_MAP[s] || s).join(", ")}
                </p>
              )}
              {config.activeScaleDirections?.length > 0 && (
                <p>
                  <strong>Direcciones Activas:</strong> {config.activeScaleDirections.map((d: string) => DIRECTIONS_MAP[d] || d).join(", ")}
                </p>
              )}
            </>
          )}
          {!config.askForIntervalSequence && !config.askForChordSequence && !config.askForScaleSequence && (
            <p>
              <strong>Modo:</strong> Nota Individual
            </p>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="mb-8">
        <NavButton to="/" name="Menú Principal" />
      </div>
      <UIContainer>
        <SectionHeader title="Resultados del Quiz" />
        <div className="p-6 text-white">
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Configuración</h3>
            <p>
              <strong>Quiz:</strong> {qn}
            </p>
            <p>
              <strong>Instrumento:</strong> {config.instrumentName || "N/A"}
            </p>
            {renderQuizConfig()}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Estadísticas</h3>
            <Stats totalQuestions={t} correctAnswers={c} wrongAnswers={w} />
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2">Historial de Respuestas</h3>
            <AnswerHistory
              answerLog={processedAnswerLog}
            />
          </div>
        </div>
      </UIContainer>
    </div>
  );
}