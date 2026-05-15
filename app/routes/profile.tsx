import { useNavigate } from "@remix-run/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { DishHistoryCard } from "~/components/DishHistoryCard";
import { Modal } from "~/components/Modal";
import { MustafoBubble } from "~/components/MustafoBubble";
import { NavBar } from "~/components/NavBar";
import { StarRating } from "~/components/StarRating";
import { ToastProvider, useToast } from "~/components/Toast";
import { EXPRESSIONS } from "~/lib/mustafo";
import {
  clearAll,
  getDishes,
  getProfile,
  updateDishRating,
} from "~/lib/storage";
import type { Dish, UserProfile } from "~/types";

function ProfileInner({
  profile,
  initialDishes,
}: {
  profile: UserProfile;
  initialDishes: Dish[];
}) {
  const { notify } = useToast();
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleRate(id: string, rating: number) {
    updateDishRating(id, rating);
    setDishes((curr) => curr.map((d) => (d.id === id ? { ...d, rating } : d)));
    if (rating === 5) notify("Yasss 5 stars!", "success");
  }

  function handleDelete() {
    clearAll();
    window.location.href = "/onboarding";
  }

  const stats = {
    total: dishes.length,
    avg:
      dishes.length === 0
        ? 0
        : Number(
            (
              dishes.reduce((acc, d) => acc + (d.rating || 0), 0) /
              dishes.filter((d) => d.rating > 0).length
            ).toFixed(1),
          ) || 0,
    fiveStars: dishes.filter((d) => d.rating === 5).length,
  };

  return (
    <>
      <NavBar username={profile.username} profileImage={profile.profileImage} />

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-24">
        {/* Header */}
        <section className="card-base p-6 md:p-8 mb-8 relative overflow-hidden">
          <span className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-coral/10 blur-3xl" />
          <span className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-fresh/15 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
            <motion.div
              className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white shadow-card grid place-items-center bg-gradient-to-br from-sunny to-coral flex-shrink-0"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display font-bold text-3xl text-white">
                  {profile.username
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join("")}
                </span>
              )}
            </motion.div>
            <div className="flex-1">
              <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-tight">
                {profile.username}
              </h1>
              <p className="font-body text-muted mt-1">
                You've made{" "}
                <span className="font-display font-bold text-ink">
                  {stats.total}
                </span>{" "}
                dish{stats.total === 1 ? "" : "es"} and we're so proud 🥳
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="chip bg-fresh/15 text-fresh">
                  ✓ {stats.total} cooked
                </span>
                {stats.avg > 0 && (
                  <span className="chip bg-sunny/20 text-ink">
                    ★ {stats.avg.toFixed(1)} avg
                  </span>
                )}
                {stats.fiveStars > 0 && (
                  <span className="chip bg-coral/15 text-coral">
                    🔥 {stats.fiveStars} five-star
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Dishes grid or empty state */}
        {dishes.length === 0 ? (
          <section className="card-base p-8 md:p-12 text-center">
            <img
              src={EXPRESSIONS[1]}
              alt="Mustafo curious"
              className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            />
            <h2 className="font-display font-bold text-2xl md:text-3xl text-ink mb-2">
              No dishes yet, but you're about to change that!
            </h2>
            <p className="font-body text-muted max-w-md mx-auto mb-6">
              Head to the chat and tell me what's in your fridge. We'll find your
              first masterpiece together.
            </p>
            <a href="/" className="btn-primary inline-flex">
              Let's go
              <span aria-hidden>🚀</span>
            </a>
          </section>
        ) : (
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display font-bold text-2xl text-ink">
                Dishes you've made
              </h2>
              <p className="font-body text-xs text-muted">
                Tap a star to rate. Click a dish to re-read the recipe.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dishes.map((d) => (
                <DishHistoryCard
                  key={d.id}
                  dish={d}
                  onRate={(r) => handleRate(d.id, r)}
                  onOpen={() => setOpenDish(d)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="mt-14 text-center">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="font-display font-semibold text-sm text-muted hover:text-coral transition-colors underline-offset-4 hover:underline"
          >
            Delete account & start fresh
          </button>
        </section>
      </main>

      {/* Floating Mustafo motivator */}
      <div className="hidden md:block fixed bottom-6 right-6 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <MustafoBubble
            align="right"
            size="sm"
            messages={
              dishes.length === 0
                ? [
                    "Empty list? Means infinite potential.",
                    "Let's fix that. Head back to the chat.",
                  ]
                : [
                    `${dishes.length} down. What's next?`,
                    "Rate the bangers honestly.",
                    "1-star is still data. We learn.",
                  ]
            }
          />
        </div>
      </div>

      {/* Recipe detail modal */}
      <Modal
        open={!!openDish}
        onClose={() => setOpenDish(null)}
        title={openDish?.dishName}
        size="lg"
      >
        {openDish && (
          <div className="space-y-6">
            {openDish.mealImage && (
              <img
                src={openDish.mealImage}
                alt={openDish.dishName}
                className="w-full h-48 md:h-56 object-cover rounded-[16px]"
              />
            )}
            <p className="font-body text-sm text-muted italic">
              Originally from: "{openDish.originalIngredients}"
            </p>
            <div>
              <StarRating
                value={openDish.rating}
                onChange={(r) => {
                  handleRate(openDish.id, r);
                  setOpenDish({ ...openDish, rating: r });
                }}
                size={24}
              />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg mb-2 text-ink">
                Ingredients
              </h3>
              <ul className="flex flex-col gap-1">
                {openDish.recipe.ingredients.map((i, idx) => (
                  <li key={idx} className="font-body text-sm text-ink">
                    <span className={i.isYouMightNeed ? "italic text-muted" : ""}>
                      {i.quantity} {i.unit} {i.name}
                      {i.isYouMightNeed && " (might need)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg mb-2 text-ink">
                Steps
              </h3>
              <ol className="flex flex-col gap-2.5">
                {openDish.recipe.instructions.map((s, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-fresh text-white font-display font-bold text-xs grid place-items-center">
                      {idx + 1}
                    </span>
                    <p className="font-body text-sm text-ink leading-relaxed pt-0.5">
                      {s}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Delete everything?"
      >
        <p className="font-body text-sm text-ink mb-6">
          This wipes your profile and all your saved dishes from this browser. It
          can't be undone.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="btn-ghost"
          >
            Nevermind
          </button>
          <button type="button" onClick={handleDelete} className="btn-danger">
            Yes, delete it all
          </button>
        </div>
      </Modal>
    </>
  );
}

export default function ProfileRoute() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[] | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate("/onboarding", { replace: true });
      return;
    }
    setProfile(p);
    setDishes(getDishes());
  }, [navigate]);

  if (!profile || !dishes) return null;
  return (
    <ToastProvider>
      <ProfileInner profile={profile} initialDishes={dishes} />
    </ToastProvider>
  );
}
