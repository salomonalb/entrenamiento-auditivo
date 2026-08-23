import { Link } from "react-router";

interface NavButtonProps {
  to: string;
  name: string;
}
export default function NavButton({ to, name }: NavButtonProps) {
  return (
    <Link
      to={to}
      className="bg-indigo-900/30 text-indigo-100 px-6 py-4 rounded-lg shadow-md hover:bg-indigo-800 transition-all duration-500 text-center font-medium cursor-pointer transform"
    >
      {name}
    </Link>
  );
}
