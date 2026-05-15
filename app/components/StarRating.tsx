import { motion } from "motion/react";
import { useState } from "react";

type Props = {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function StarRating({ value, onChange, size = 22, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value;

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={`Rate this dish, ${value} of 5 stars`}
      className="inline-flex items-center gap-1.5"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= active;
        return (
          <motion.button
            type="button"
            key={n}
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(n)}
            whileHover={!readOnly ? { scale: 1.2 } : undefined}
            whileTap={!readOnly ? { scale: 0.9 } : undefined}
            animate={filled ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
            transition={{ duration: 0.25 }}
            className={`leading-none ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            style={{ fontSize: size }}
          >
            <span style={{ color: filled ? "#FBBF24" : "#D1D5DB" }}>★</span>
          </motion.button>
        );
      })}
    </div>
  );
}
