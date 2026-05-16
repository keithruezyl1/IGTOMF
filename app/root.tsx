import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import tailwind from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwind },
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  { rel: "icon", href: "/favicon.svg?v=2", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/favicon.svg?v=2" },
];

export const meta: MetaFunction = () => [
  { title: "I Got This In My Fridge" },
  {
    name: "description",
    content:
      "Turn what you've already got into something delicious. Mustafo, your AI chef, is ready when you are.",
  },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { name: "theme-color", content: "#22C55E" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Something went sideways on our end.";
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="card-base max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-3">😵‍💫</div>
        <h1 className="text-2xl font-display font-bold mb-2">
          Oops! Something went wrong.
        </h1>
        <p className="text-muted text-sm">{message}</p>
        <a href="/" className="btn-primary mt-6 inline-flex">
          Take me home
        </a>
      </div>
    </div>
  );
}
