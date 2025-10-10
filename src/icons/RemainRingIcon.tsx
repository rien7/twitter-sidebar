import { cn } from "@/utils/cn";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface RemainRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

const RemainRing = ({
  progress,
  size = 20,
  strokeWidth = 2,
  className,
  color,
}: RemainRingProps) => {
  const clampedProgress = clamp(progress, 0, 1);
  const radius = size / 2;
  const circumference = 2 * Math.PI * radius || 1;
  const dashoffset = circumference * (1 - clampedProgress);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={clampedProgress}
      className={cn(
        "transform -rotate-90 transition-[height,width] duration-150",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        height="100%"
        width="100%"
        style={{ overflow: "visible" }}
      >
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="var(--color-twitter-border-light)"
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={color ?? "var(--color-twitter-accent)"}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default RemainRing;
