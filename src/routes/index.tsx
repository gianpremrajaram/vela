import { createFileRoute } from "@tanstack/react-router";
import { VelaApp } from "@/components/VelaApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vela — calm RSVP reading" },
      {
        name: "description",
        content:
          "Vela is a calm, comprehension-first RSVP reader: words flash one at a time on the left, while the full document stays in view on the right.",
      },
      { property: "og:title", content: "Vela — calm RSVP reading" },
      {
        property: "og:description",
        content: "A calm, comprehension-first RSVP reader with a synced two-pane layout.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <VelaApp />;
}
