type CenteredBarProps = {
  value: number; // Wartość do wyświetlenia
  maxAmount: number; // Maksymalna wartość osi
};

export function CenteredBar({ value, maxAmount }: CenteredBarProps) {
  // Oblicz szerokości dla pozytywnych i negatywnych wartości
  const positiveWidth = value > 0 ? (value / maxAmount) * 50 : 0;
  const negativeWidth = value < 0 ? (Math.abs(value) / maxAmount) * 50 : 0;

  return (
    <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      {/* Pasek negatywny (czerwony) */}
      <div
        className="absolute left-1/2 top-0 h-full bg-red-500"
        style={{
          width: `${negativeWidth}%`,
          transform: "translateX(-100%)",
        }}
      />
      {/* pasek rozdzielający */}
      <div
        className="absolute left-1/2 top-0 h-full bg-slate-700"
        style={{ width: "1px" }}
      />

      {/* Pasek pozytywny (zielony) */}
      <div
        className="absolute left-[calc(1px+50%)] top-0 h-full bg-green-500"
        style={{ width: `${positiveWidth}%` }}
      />
    </div>
  );
}
