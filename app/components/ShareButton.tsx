import React, { useState } from "react";
import { encodeQuizState, type QuizState } from "~/utils/urlState";

interface ShareButtonProps {
  quizState: QuizState;
  disabled: boolean;
}

export default function ShareButton({ quizState, disabled }: ShareButtonProps) {
  const [copyFeedback, setCopyFeedback] = useState("");

  const handleShare = () => {
    if (disabled) {
      setCopyFeedback("Complete al menos una pregunta para compartir.");
      setTimeout(() => setCopyFeedback(""), 2000);
      return;
    }
    const encodedState = encodeQuizState(quizState);
    const shareUrl = `${window.location.origin}/?quiz=verify&result=${encodedState}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setCopyFeedback("Link copiado al portapapeles!");
        setTimeout(() => setCopyFeedback(""), 2000);
      },
      (err) => {
        setCopyFeedback("Error al copiar el link.");
        console.error("Could not copy text: ", err);
        setTimeout(() => setCopyFeedback(""), 2000);
      }
    );
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleShare}
        disabled={disabled}
        className={`py-2 px-4 rounded-lg text-lg font-medium transition-all duration-200 transform ${
          disabled
            ? "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-50 cursor-not-allowed"
            : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800 hover:scale-105 shadow-md cursor-pointer"
        }`}
      >
        Compartir Resultado
      </button>
      {copyFeedback && (
        <p className="text-sm mt-2 text-white">{copyFeedback}</p>
      )}
    </div>
  );
}