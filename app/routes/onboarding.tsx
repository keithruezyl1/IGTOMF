import { useNavigate } from "@remix-run/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { MustafoBubble } from "~/components/MustafoBubble";
import { getProfile, setProfile } from "~/lib/storage";
import { EXPRESSIONS } from "~/lib/mustafo";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getProfile()) navigate("/", { replace: true });
  }, [navigate]);

  const nameValid = username.trim().length >= 2 && username.trim().length <= 50;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function finish(skipImage = false) {
    setProfile({
      username: username.trim(),
      profileImage: skipImage ? null : profileImage,
      createdAt: new Date().toISOString(),
    });
    navigate("/", { replace: true });
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-5 md:p-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <motion.img
            src={EXPRESSIONS[step === 1 ? 1 : 4]}
            alt="Mustafo"
            className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
            initial={{ y: -40, opacity: 0, rotate: -8 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            key={step}
          />
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                step >= 1 ? "bg-fresh w-8" : "bg-soft"
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                step >= 2 ? "bg-fresh w-8" : "bg-soft"
              }`}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.section
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="card-base p-7 md:p-9"
            >
              <h1 className="font-display font-bold text-2xl md:text-3xl mb-2 text-ink">
                Hey! I'm Mustafo.
              </h1>
              <p className="font-body text-sm md:text-base text-muted leading-relaxed mb-6">
                I'm your personal AI chef who works with what you've actually got, like random stuff in your fridge.
                What should I call you?
              </p>

              <label className="font-body font-semibold text-sm text-ink block mb-2">
                What's your name?
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Albert, FridgeMaster3000, or just 'Chef'"
                maxLength={50}
                autoFocus
                className="input-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameValid) setStep(2);
                }}
              />
              {username && !nameValid && (
                <p className="text-coral text-xs font-body mt-2 ml-1">
                  Names should be 2–50 characters.
                </p>
              )}

              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  disabled={!nameValid}
                  onClick={() => setStep(2)}
                  className="btn-primary"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="card-base p-7 md:p-9"
            >
              <h1 className="font-display font-bold text-2xl md:text-3xl mb-2 text-ink">
                Nice to meet you, {username.split(" ")[0]}.
              </h1>
              <p className="font-body text-sm md:text-base text-muted leading-relaxed mb-6">
                Drop a profile pic so I can recognize you. (Totally optional.)
              </p>

              <label className="relative flex flex-col items-center justify-center gap-3 cursor-pointer rounded-card border-2 border-dashed border-[#E5E7EB] hover:border-fresh hover:bg-fresh/5 transition-all p-8 group">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Preview"
                    className="w-28 h-28 rounded-full object-cover ring-4 ring-fresh/30"
                  />
                ) : (
                  <span className="text-5xl group-hover:scale-110 transition-transform">
                    📸
                  </span>
                )}
                <span className="font-display font-semibold text-sm text-ink">
                  {profileImage ? "Change photo" : "Click to upload"}
                </span>
                <span className="font-body text-xs text-muted">
                  .jpg, .png, .webp — up to 2 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 2 * 1024 * 1024) handleFile(file);
                  }}
                />
              </label>

              <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost"
                >
                  Back
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => finish(true)}
                    className="btn-ghost"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => finish(false)}
                    className="btn-primary"
                  >
                    Let's cook
                    <span aria-hidden>👨‍🍳</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {step === 1 && (
          <div className="mt-8 flex justify-center">
            <MustafoBubble
              messages={[
                "Don't overthink the name.",
                "First name's fine.",
                "Or a chef nickname — go wild.",
              ]}
              size="sm"
            />
          </div>
        )}
      </div>
    </main>
  );
}
