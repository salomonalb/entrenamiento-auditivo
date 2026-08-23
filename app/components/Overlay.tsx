interface OverlayProps {
  setShowSettings: (show: boolean) => void;
  setShowHistory: (show: boolean) => void;
}

export default function Overlay({
  setShowSettings,
  setShowHistory,
}: OverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 bg-opacity-50 z-40 duration-300 cursor-pointer"
      onClick={() => {
        setShowSettings(false);
        setShowHistory(false);
      }}
    />
  );
}
