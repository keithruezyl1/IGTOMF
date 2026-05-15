import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  message: string;
  variant: "success" | "error";
};

type Ctx = {
  notify: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback<Ctx["notify"]>((message, variant = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((curr) => [...curr, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              className={`pointer-events-auto rounded-[14px] px-5 py-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] font-display font-semibold text-sm flex items-center gap-2 ${
                t.variant === "success" ? "bg-fresh" : "bg-coral"
              }`}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              <span aria-hidden>{t.variant === "success" ? "✓" : "✕"}</span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
