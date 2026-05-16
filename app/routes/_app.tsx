import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useOutletContext } from "@remix-run/react";
import { useEffect, useState } from "react";

import { NavBar } from "~/components/NavBar";
import { ToastProvider } from "~/components/Toast";
import { getProfileImage } from "~/lib/dishes.client";
import { requireProfile } from "~/lib/session.server";
import type { UserProfile } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await requireProfile(request);
  return json({ profile });
}

type AppContext = { profile: UserProfile; profileImage: string | null };

export default function AppLayout() {
  const { profile } = useLoaderData<typeof loader>();
  const [profileImage, setProfileImageState] = useState<string | null>(null);

  useEffect(() => {
    setProfileImageState(getProfileImage());
  }, []);

  return (
    <ToastProvider>
      <NavBar username={profile.username} profileImage={profileImage} />
      <Outlet
        context={{ profile, profileImage } satisfies AppContext}
      />
    </ToastProvider>
  );
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}
