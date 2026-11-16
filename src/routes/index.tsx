import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Veya World — Pixel MMORPG" },
      { name: "description", content: "A top-down pixel-art multiplayer world. Join, customize your character and explore with friends." },
      { property: "og:title", content: "Veya World — Pixel MMORPG" },
      { property: "og:description", content: "A top-down pixel-art multiplayer world. Join, customize your character and explore with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
