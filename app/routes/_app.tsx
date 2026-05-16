import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useOutletContext } from "@remix-run/react";

import { NavBar } from "~/components/NavBar";
import { ToastProvider } from "~/components/Toast";
import { requireProfile } from "~/lib/session.server";
import type { UserProfile } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await requireProfile(request);
  return json({ profile });
}

type AppContext = { profile: UserProfile };

export default function AppLayout() {
  const { profile } = useLoaderData<typeof loader>();
  return (
    <ToastProvider>
      <NavBar
        username={profile.username}
        profileImage={profile.profileImage}
      />
      <Outlet context={{ profile } satisfies AppContext} />
    </ToastProvider>
  );
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}
