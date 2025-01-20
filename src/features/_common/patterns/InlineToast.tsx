import { AnimatePresence, motion } from "framer-motion";
import React, { ReactNode, useEffect, useState } from "react";

interface InlineToastProps {
  children: ReactNode;
  delay: number; // delay in milliseconds
  className?: string;
  contentAfter?: ReactNode;
}

export const InlineToast: React.FC<InlineToastProps> = ({
  children,
  delay,
  className,
  contentAfter,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Handle timeout to hide the toast after the delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // Handle manual close on click
  const handleClick = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence presenceAffectsLayout mode="wait">
      {isVisible && (
        <motion.div
          key="toast"
          className={className}
          onClick={handleClick}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
          }}
          transition={{
            opacity: { duration: 0.5 },
          }}
        >
          {children}
        </motion.div>
      )}
      {contentAfter && !isVisible && (
        <motion.div
          key="content-after"
          className={className}
          onClick={handleClick}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
          }}
          transition={{
            opacity: { duration: 0.5, delay },
          }}
        >
          {contentAfter}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineToast;
