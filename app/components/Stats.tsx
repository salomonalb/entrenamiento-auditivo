interface StatsProps {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
}

export default function Stats({
  totalQuestions,
  correctAnswers,
  wrongAnswers,
}: StatsProps) {
  return (
    <div className="flex justify-center space-x-4 mb-6 w-full max-w-md">
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 flex-1 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">
          {totalQuestions}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 flex-1 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Correctas</p>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {correctAnswers}
          <span className="text-sm font-normal ml-1">
            (
            {totalQuestions > 0
              ? ((correctAnswers / totalQuestions) * 100).toFixed(0)
              : 0}
            %)
          </span>
        </p>
      </div>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 flex-1 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Erradas</p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
          {wrongAnswers}
          <span className="text-sm font-normal ml-1">
            (
            {totalQuestions > 0
              ? ((wrongAnswers / totalQuestions) * 100).toFixed(0)
              : 0}
            %)
          </span>
        </p>
      </div>
    </div>
  );
}
