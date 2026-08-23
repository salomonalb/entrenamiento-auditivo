import XIcon from "./XIcon";

interface SidePanelProps {
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  text: string;
  children: React.ReactNode;
}

export default function SidePanel({
  showPanel,
  setShowPanel,
  text,
  children,
}: SidePanelProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
        showPanel ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {text}
          </h2>
          <button
            title="Cerrar panel"
            onClick={() => setShowPanel(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
