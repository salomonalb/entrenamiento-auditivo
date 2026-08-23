export default function UIContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden max-w-4xl mx-auto">
      {children}
    </div>
  );
}
