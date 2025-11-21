interface CircleButtonProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  children: React.ReactNode;
}
export default function CircleButton({
  children,
  showSidebar,
  setShowSidebar,
}: CircleButtonProps) {
  return (
    <button
      onClick={() => setShowSidebar(!showSidebar)}
      className="text-white bg-indigo-500 hover:bg-indigo-400 rounded-full p-2 transition-all duration-200  cursor-pointer"
      aria-label="Mostrar"
    >
      {children}
    </button>
  );
}
