interface QuizOptionButtonProps {
  option: string;
  isActive: boolean;
  isAnswering: boolean;
  handleAnswer: (option: string) => void;
  isSelected?: boolean;
}

export default function QuizOptionButton({
  option,
  isActive,
  isAnswering,
  handleAnswer,
  isSelected = false,
}: QuizOptionButtonProps) {
  return (
    <button
      key={option}
      onClick={() => handleAnswer(option)}
      disabled={!isAnswering || !isActive}
      className={`py-4 px-2 rounded-lg text-lg font-medium transition-all duration-200 ${
        !isActive
          ? "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-50"
          : isSelected
          ? "bg-indigo-300 text-indigo-900 dark:bg-indigo-600 dark:text-indigo-50 ring-2 ring-indigo-400"
          : isAnswering
          ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800 transform hover:scale-105 shadow-md cursor-pointer"
          : "bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
      }`}
    >
      {option}
    </button>
  );
}
