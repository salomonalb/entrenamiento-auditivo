interface AnswerHistoryProps {
  answerLog: { correct: string; user: string; isCorrect: boolean }[];
}

export default function AnswerHistory({ answerLog }: AnswerHistoryProps) {
  return (
    <>
      {answerLog.length > 0 ? (
        <div className="overflow-y-auto">
          {answerLog.map((entry, index) => (
            <div
              key={index}
              className={`flex justify-between items-center px-4 py-3 mb-2 rounded-lg ${
                entry.isCorrect
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <div className="flex items-center">
                <span
                  className={`inline-block text-xl mr-2 ${
                    entry.isCorrect
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {entry.isCorrect ? "✅" : "❌"}
                </span>
                <span className="font-medium">{entry.user}</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {entry.correct}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          No hay respuestas registradas aún.
        </p>
      )}
    </>
  );
}
