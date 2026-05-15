import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { EXPRESSIONS, LOADING_MESSAGES } from "~/lib/mustafo";

type Props = {
  open: boolean;
  /** Override the rotating messages */
  messages?: readonly string[] | string[];
};

export function LoadingOverlay({ open, messages = LOADING_MESSAGES }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % Math.max(messages.length, EXPRESSIONS.length));
    }, 1700);
    return () => window.clearInterval(id);
  }, [open, messages.length]);

  const message = messages[idx % messages.length];
  const expression = EXPRESSIONS[idx % EXPRESSIONS.length];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
          role="status"
        >
          <div className="flex flex-col items-center px-6 text-center max-w-md">
            <div className="relative h-56 w-56 md:h-64 md:w-64 mb-4 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={expression}
                  src={expression}
                  alt="Mustafo expression"
                  className="absolute inset-0 w-full h-full object-contain"
                  initial={{ y: -260, rotate: -10, opacity: 0 }}
                  animate={{
                    y: 0,
                    rotate: 0,
                    opacity: 1,
                    transition: { type: "spring", stiffness: 260, damping: 18 },
                  }}
                  exit={{
                    y: 260,
                    rotate: 10,
                    opacity: 0,
                    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
                  }}
                />
              </AnimatePresence>
            </div>

            <div className="relative h-16 w-full overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={message}
                  className="absolute inset-x-0 font-display text-white text-xl md:text-2xl font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  initial={{ y: -50, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    transition: { type: "spring", stiffness: 240, damping: 20 },
                  }}
                  exit={{
                    y: 60,
                    opacity: 0,
                    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                  }}
                >
                  {message}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 mt-6">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="block w-2.5 h-2.5 rounded-full bg-white"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    delay: d * 0.18,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
