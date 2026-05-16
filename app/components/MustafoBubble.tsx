import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { TALKING } from "~/lib/mustafo";

type Props = {
  messages: readonly string[] | string[];
  intervalMs?: number;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
};

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-20 h-20",
  md: "w-28 h-28",
  lg: "w-36 h-36",
};

export function MustafoBubble({
  messages,
  intervalMs = 3800,
  size = "md",
  align = "left",
}: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [poseIndex, setPoseIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
      setPoseIndex((i) => (i + 1) % TALKING.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [messages.length, intervalMs]);

  const message = messages[messageIndex];
  const pose = TALKING[poseIndex];
  const flex = align === "right" ? "flex-row-reverse" : "flex-row";

  return (
    <div className={`flex items-end gap-3 ${flex}`}>
      <motion.img
        key={pose}
        src={pose}
        alt="Mustafo talking"
        className={`${SIZES[size]} object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.15)] flex-shrink-0`}
        initial={{ scale: 0.92, rotate: -3, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.92, rotate: 3, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
      />
      <div
        className={`relative bg-white rounded-card shadow-card px-5 py-4 max-w-xs min-w-[180px] mb-3 md:mb-5 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <span
          className={`absolute bottom-3 w-3 h-3 rotate-45 bg-white ${
            align === "right" ? "-right-1.5" : "-left-1.5"
          }`}
        />
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            className="font-display text-sm md:text-base font-semibold text-ink leading-snug"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
