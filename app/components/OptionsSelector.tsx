// Define the props interface
interface OptionsSelectorProps {
  options: string[];
  activeOptions: string[];
  toggleOption: (option: string) => void;
  title: string;
}

export default function OptionSelector({
  options,
  activeOptions,
  toggleOption,
  title,
}: OptionsSelectorProps) {
  return (
    <div>
      <p className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${
              activeOptions.includes(option)
                ? "bg-indigo-50 dark:bg-indigo-900/30"
                : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
            }`}
          >
            <input
              type="checkbox"
              checked={activeOptions.includes(option)}
              onChange={() => toggleOption(option)}
              className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <span
              className={`${
                activeOptions.includes(option)
                  ? "font-medium text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-400"
              }`}
            >
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
