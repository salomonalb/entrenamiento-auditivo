import MicIcon from "./MicIcon";

interface MicButtonProps {
  isLoading: boolean;
  isRecording: boolean;
  text: string;
  record: () => void;
  disabled?: boolean;
}

export default function MicButton({
  isLoading,
  isRecording,
  text,
  record,
  disabled,
}: MicButtonProps) {
  const isDisabled = isLoading || isRecording || disabled;
  return (
    <button
      onClick={record}
      disabled={isDisabled}
      className={`mb-8 px-8 py-4 rounded-full shadow-lg flex items-center hover:cursor-pointer justify-center text-lg font-medium transition-all duration-200 ${
        !isDisabled
          ? "bg-indigo-600 hover:bg-indigo-500 text-white transform hover:scale-105"
          : "bg-gray-400 text-gray-200 cursor-not-allowed"
      }`}
    >
      <MicIcon />
      {text}
    </button>
  );
}
