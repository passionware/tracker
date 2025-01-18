import { motion } from "framer-motion";
type Props = {
  value: number;
  className?: string;
};

export default function CircleProgress({ value, className }: Props) {
  const percentage = Math.min(Math.max(value, 0), 100);
  const width = 216;
  const radius = 98;

  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg
      width={width}
      viewBox={`0 0 ${width} ${width}`}
      height={width}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient
          id="circle-progress"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(53.1659 -18.1884) rotate(51.1683) scale(267.012 282.957)"
        >
          <stop stopColor="#F05F84" />
          <stop offset="1" stopColor="#FD312E" />
        </radialGradient>
      </defs>
      <circle
        cx={width / 2}
        cy={width / 2}
        r={radius}
        strokeLinecap="round"
        className="fill-none stroke-neutral-300 stroke-[20px]"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: circumference,
        }}
      />

      <motion.circle
        cx={"108"}
        cy={"108"}
        r="98"
        strokeLinecap="round"
        className="fill-none stroke-[url('#circle-progress')] stroke-[20px]"
        initial={{
          strokeDashoffset: circumference,
          strokeDasharray: circumference,
        }}
        animate={{ strokeDashoffset: offset }}
        transition={{
          stiffness: 260,
          damping: 20,
          delay: 0.1,
          duration: 0.5,
          ease: "easeOut",
        }}
      />
    </svg>
  );
}
