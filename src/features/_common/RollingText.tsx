import { cn } from "@/lib/utils.ts";
import * as React from "react";
import { motion } from "framer-motion";

interface RollingTextProps {
  children: React.ReactNode;
  containerClassName?: string;
  textClassName?: string;
  scrollDuration?: number;
  pauseDuration?: number;
}

export function RollingText({
  children,
  containerClassName,
  textClassName,
  scrollDuration = 5,
  pauseDuration = 2,
}: RollingTextProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);

  const [shouldAnimate, setShouldAnimate] = React.useState(false);
  const [distance, setDistance] = React.useState(0);

  React.useEffect(() => {
    if (containerRef.current && textRef.current) {
      // Szerokość widocznego kontenera
      const containerWidth = containerRef.current.offsetWidth;
      // Całkowita szerokość zawartości
      const textWidth = textRef.current.scrollWidth;

      if (textWidth > containerWidth) {
        setDistance(textWidth - containerWidth);
        setShouldAnimate(true);
      } else {
        setShouldAnimate(false);
      }
    }
  }, [children]);

  // Czas całkowity animacji tam i z powrotem + pauzy na końcach
  const totalDuration = scrollDuration * 2 + pauseDuration * 2;
  // moment (ułamek 0-1) dotarcia do końca kontenera
  const firstMoveEnd = scrollDuration / totalDuration;
  // moment końca pauzy po dotarciu do końca
  const firstPauseEnd = (scrollDuration + pauseDuration) / totalDuration;
  // moment, w którym wrócimy do pozycji 0 (z kolejną pauzą)
  const secondMoveEnd = (scrollDuration * 2 + pauseDuration) / totalDuration;

  // Keyframes dla x (przesuw w poziomie)
  const animateX = shouldAnimate
    ? {
        x: [0, -distance, -distance, 0, 0],
      }
    : { x: 0 };

  const transitionX = shouldAnimate
    ? {
        duration: totalDuration,
        ease: "linear" as const,
        repeat: Infinity, // powtarzaj bez końca
        times: [0, firstMoveEnd, firstPauseEnd, secondMoveEnd, 1],
      }
    : { duration: 0 };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden w-full", containerClassName)}
    >
      <motion.div
        ref={textRef}
        className={cn("flex flex-row items-center gap-0.5", textClassName)}
        animate={animateX}
        transition={transitionX}
      >
        {children}
      </motion.div>
    </div>
  );
}
