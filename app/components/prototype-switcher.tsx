import { useEffect } from "react";
import { useSearchParams } from "react-router";

const variants = [
  { key: "A", name: "Bell popover" },
  { key: "B", name: "Inbox drawer" },
  { key: "C", name: "Activity strip" },
] as const;

export function PrototypeSwitcher({ current }: { current: "A" | "B" | "C" }) {
  const [params, setParams] = useSearchParams();
  const index = variants.findIndex((variant) => variant.key === current);

  function cycle(direction: number) {
    const next = new URLSearchParams(params);
    next.set(
      "variant",
      variants[(index + direction + variants.length) % variants.length].key
    );
    setParams(next, { replace: true });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-xl">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => cycle(-1)}
      >
        ←
      </button>
      <span>
        Prototype {current}: {variants[index].name}
      </span>
      <button type="button" aria-label="Next variant" onClick={() => cycle(1)}>
        →
      </button>
    </div>
  );
}
