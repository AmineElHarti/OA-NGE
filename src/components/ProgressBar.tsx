interface Props {
  value: number; // 0-100
  color?: string;
  height?: string;
}

export function ProgressBar({ value, color = '#3b82f6', height = 'h-2' }: Props) {
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
