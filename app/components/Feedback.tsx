interface FeedbackProps {
  feedback: string | null;
  text: string;
}

export default function Feedback({ feedback, text }: FeedbackProps) {
  return (
    <div
      className={`mb-8 py-3 px-6 rounded-lg text-xl font-bold text-center w-full max-w-md transition-all duration-200 ${
        feedback
          ? feedback.includes("✅")
            ? " bg-green-900 text-green-100"
            : " bg-red-900 text-red-100"
          : " bg-indigo-900/30 text-indigo-100"
      }`}
    >
      {feedback || text}
    </div>
  );
}
