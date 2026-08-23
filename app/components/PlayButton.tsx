import PlayIcon from "./PlayIcon";

interface PlayButtonProps {
  currentSampler: any;
  isLoading: boolean;
  isAnswering: boolean;
  text: string;
  play: () => void;
}

export default function PlayButton({
  currentSampler,
  isLoading,
  isAnswering,
  text,
  play,
}: PlayButtonProps) {
  return (
    <button
      onClick={() => {
        if (currentSampler) {
          play();
        }
      }}
      disabled={isLoading || !currentSampler || !isAnswering}
      className={`mb-8 px-8 py-4 rounded-full shadow-lg flex items-center hover:cursor-pointer justify-center text-lg font-medium transition-all duration-200 ${
        isAnswering
          ? "bg-indigo-600 hover:bg-indigo-500 text-white transform hover:scale-105"
          : "bg-gray-400 text-gray-200 cursor-not-allowed"
      }`}
    >
      <PlayIcon />
      {text}
    </button>
  );
}
