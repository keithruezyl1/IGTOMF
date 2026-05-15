import { Link, useLocation } from "@remix-run/react";
import { motion } from "motion/react";

type Props = {
  username?: string;
  profileImage?: string | null;
};

function Initials({ name }: { name: string }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="font-display font-bold text-sm text-ink">{letters || "🍳"}</span>
  );
}

export function NavBar({ username, profileImage }: Props) {
  const location = useLocation();
  const isProfile = location.pathname.startsWith("/profile");

  return (
    <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-lg border-b border-black/5">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" prefetch="intent">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            🍳
          </motion.span>
          <span className="font-display font-bold text-base md:text-lg leading-tight">
            I Got This <span className="text-fresh">In My Fridge</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            prefetch="intent"
            className={`px-4 py-2 rounded-pill font-display font-semibold text-sm transition-all ${
              !isProfile ? "bg-ink text-white" : "text-ink hover:bg-soft"
            }`}
          >
            Cook
          </Link>
          <Link
            to="/profile"
            prefetch="intent"
            className={`px-3 py-1.5 rounded-pill font-display font-semibold text-sm transition-all flex items-center gap-2 ${
              isProfile ? "bg-ink text-white" : "text-ink hover:bg-soft"
            }`}
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sunny to-coral grid place-items-center overflow-hidden ring-2 ring-white">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Initials name={username ?? "You"} />
              )}
            </span>
            <span className="hidden sm:inline">
              {username ? username.split(" ")[0] : "Profile"}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
