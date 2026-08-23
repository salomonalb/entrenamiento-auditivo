interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="bg-indigo-600 dark:bg-indigo-700 px-6 py-4">
      <h1 className="text-2xl font-bold text-white text-center">{title}</h1>
    </div>
  );
}
