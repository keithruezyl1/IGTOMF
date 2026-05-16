import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { MustafoBubble } from "~/components/MustafoBubble";
import {
  LEGACY_PROFILE_KEY,
  setProfileImage as setProfileImageLocal,
} from "~/lib/dishes.client";
import { EXPRESSIONS } from "~/lib/mustafo";
import {
  clearProfile,
  getProfile,
  setProfile,
} from "~/lib/session.server";
import type { UserProfile } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await getProfile(request);
  if (profile) throw redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "migrate") {
    const raw = String(form.get("profile") ?? "");
    try {
      const parsed = JSON.parse(raw) as { username?: unknown; createdAt?: unknown };
      if (
        typeof parsed.username !== "string" ||
        parsed.username.trim().length < 2
      ) {
        return json({ ok: false, error: "Invalid migrate payload" }, 400);
      }
      const profile: UserProfile = {
        username: parsed.username.trim(),
        createdAt:
          typeof parsed.createdAt === "string"
            ? parsed.createdAt
            : new Date().toISOString(),
      };
      const headers = await setProfile(request, profile);
      return json({ ok: true }, { headers });
    } catch {
      return json({ ok: false, error: "Bad JSON" }, 400);
    }
  }

  if (intent === "logout") {
    const headers = await clearProfile(request);
    return redirect("/onboarding", { headers });
  }

  const username = String(form.get("username") ?? "").trim();
  if (username.length < 2 || username.length > 50) {
    return json({ error: "Pick a name between 2 and 50 characters." }, 400);
  }
  const profile: UserProfile = {
    username,
    createdAt: new Date().toISOString(),
  };
  const headers = await setProfile(request, profile);
  return redirect("/", { headers });
}

export default function Onboarding() {
  const navigation = useNavigation();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const raw = window.localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        profileImage?: unknown;
      };
      if (typeof parsed.profileImage === "string") {
        setProfileImageLocal(parsed.profileImage);
      }
    } catch {
      // ignore — legacy payload was malformed
    }
    const body = new FormData();
    body.set("intent", "migrate");
    body.set("profile", raw);
    fetch("/onboarding", { method: "POST", body }).then((res) => {
      if (res.ok) {
        window.localStorage.removeItem(LEGACY_PROFILE_KEY);
        window.location.replace("/");
      }
    });
  }, []);

  const nameValid =
    username.trim().length >= 2 && username.trim().length <= 50;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileImage(reader.result);
        setProfileImageLocal(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const isSubmitting = navigation.state === "submitting";

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

        <Form method="post">
          <input type="hidden" name="username" value={username.trim()} />
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <Step1
                key="step1"
                username={username}
                setUsername={setUsername}
                onNext={() => nameValid && setStep(2)}
                disabled={!nameValid}
              />
            ) : (
              <Step2
                key="step2"
                username={username}
                profileImage={profileImage}
                onPick={handleFile}
                onSkip={() => {
                  setProfileImage(null);
                  setProfileImageLocal(null);
                }}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </Form>
      </div>
    </main>
  );
}

function Step1(props: {
  username: string;
  setUsername: (v: string) => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <motion.section
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
      <input
        type="text"
        value={props.username}
        onChange={(e) => props.setUsername(e.target.value)}
        placeholder="Albert, Chef, or FridgeMaster3000"
        className="input-base"
        autoFocus
      />
      <button
        type="button"
        onClick={props.onNext}
        disabled={props.disabled}
        className="btn-primary mt-5 w-full"
      >
        Continue
      </button>
      <div className="mt-6 flex justify-center">
        <MustafoBubble
          align="left"
          size="sm"
          messages={[
            "I won't share your name anywhere.",
            "Nickname works too.",
          ]}
        />
      </div>
    </motion.section>
  );
}

function Step2(props: {
  username: string;
  profileImage: string | null;
  onPick: (file: File) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="card-base p-7 md:p-9"
    >
      <h1 className="font-display font-bold text-2xl md:text-3xl mb-2 text-ink">
        Nice to meet you, {props.username.split(" ")[0]}.
      </h1>
      <p className="font-body text-muted mb-6">
        Wanna add a profile picture? Totally optional.
      </p>
      <label className="block border-2 border-dashed border-soft rounded-2xl p-6 text-center cursor-pointer hover:bg-soft/30">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onPick(f);
          }}
        />
        {props.profileImage ? (
          <img
            src={props.profileImage}
            alt="preview"
            className="w-24 h-24 mx-auto rounded-full object-cover"
          />
        ) : (
          <span className="font-body text-sm text-muted">
            Tap to choose a photo
          </span>
        )}
      </label>
      <div className="flex gap-3 mt-5">
        <button
          type="submit"
          onClick={() => props.onSkip()}
          className="btn-ghost flex-1"
          disabled={props.isSubmitting}
        >
          Skip
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={props.isSubmitting}
        >
          {props.isSubmitting ? "Saving..." : "Let's cook"}
        </button>
      </div>
    </motion.section>
  );
}
