interface InstrumentSelectorProps {
  availableInstrumentConfigs: Record<string, { name: string }>;
  currentInstrumentId: string;
  changeInstrument: (instrumentId: string) => void;
  isLoading?: boolean;
}

export default function InstrumentSelector({
  currentInstrumentId,
  changeInstrument,
  availableInstrumentConfigs,
  isLoading = false,
}: InstrumentSelectorProps) {
  return (
    <div className="mb-6">
      <label
        htmlFor="instrument-select"
        className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Instrumento:
      </label>
      <select
        id="instrument-select"
        value={currentInstrumentId}
        onChange={(e) => changeInstrument(e.target.value)}
        disabled={isLoading}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 cursor-pointer"
      >
        {Object.keys(availableInstrumentConfigs).map((instrumentId) => (
          <option key={instrumentId} value={instrumentId}>
            {availableInstrumentConfigs[instrumentId].name}
          </option>
        ))}
      </select>
      {isLoading && (
        <p className="mt-1 text-sm text-indigo-500">Cargando instrumento...</p>
      )}
    </div>
  );
}
