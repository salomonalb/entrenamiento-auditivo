import { useSearchParams } from "react-router";
import NavButton from "~/components/NavButton";
import SectionHeader from "~/components/sectionHeader";
import UIContainer from "~/components/UIContainer";
import IntervalQuiz from "~/quizzes/intervals";
import ChordQuiz from "~/quizzes/chords";
import ScalesQuiz from "~/quizzes/scales";
import ScaleDegreesQuiz from "~/quizzes/scale-degrees";
import SingingQuiz from "~/quizzes/singing";
import PerfectPitchQuiz from "~/quizzes/perfect-pitch";
import VerifyResult from "./verify";

export default function main() {
  const [searchParams] = useSearchParams();
  const quiz = searchParams.get("quiz");

  if (quiz === "intervals") {
    return <IntervalQuiz />;
  }
  if (quiz === "chords") {
    return <ChordQuiz />;
  }
  if (quiz === "scales") {
    return <ScalesQuiz />;
  }
  if (quiz === "scale-degrees") {
    return <ScaleDegreesQuiz />;
  }
  if (quiz === "singing") {
    return <SingingQuiz />;
  }

  if (quiz === "perfect-pitch") {
    return <PerfectPitchQuiz />;
  }

  if (quiz === "verify") {
    return <VerifyResult />;
  }

  return (
    <UIContainer>
      <SectionHeader title="Entrenamiento Auditivo" />
      <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NavButton to="/?quiz=intervals" name="Intervalos" />
        <NavButton to="/?quiz=chords" name="Acordes" />
        <NavButton to="/?quiz=scales" name="Escalas" />
        <NavButton to="/?quiz=scale-degrees" name="Grados de la Escala" />
        <NavButton to="/?quiz=singing" name="Canto" />
        <NavButton to="/?quiz=perfect-pitch" name="Oído Absoluto" />
      </div>
    </UIContainer>
  );
}
