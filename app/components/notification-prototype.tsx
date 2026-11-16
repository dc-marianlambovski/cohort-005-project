// Three mock notification variants on /courses, switchable with ?variant=A, B, or C.
import { useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  MessageSquare,
  Receipt,
  X,
} from "lucide-react";
import { PrototypeSwitcher } from "~/components/prototype-switcher";

type Audience = "Student" | "Team Admin" | "Course Owner" | "Platform Admin";
type Notice = {
  id: string;
  audience: Audience[];
  title: string;
  detail: string;
  priority: "High" | "Normal";
  kind: "refund" | "question";
  time: string;
};

const notices: Notice[] = [
  {
    id: "request",
    audience: ["Platform Admin"],
    title: "New Refund Request",
    detail: "Alex requested a refund for React Foundations.",
    priority: "High",
    kind: "refund",
    time: "5 min ago",
  },
  {
    id: "question",
    audience: ["Course Owner"],
    title: "New course question",
    detail: "Sam asked a question in React Foundations.",
    priority: "High",
    kind: "question",
    time: "15 min ago",
  },
  {
    id: "reply",
    audience: ["Student"],
    title: "A reply to your question",
    detail: "Your Course Owner replied in React Foundations.",
    priority: "High",
    kind: "question",
    time: "1 hour ago",
  },
  {
    id: "approved",
    audience: ["Student", "Team Admin"],
    title: "Refund Request approved",
    detail: "Your request for React Foundations was approved.",
    priority: "High",
    kind: "refund",
    time: "2 hours ago",
  },
  {
    id: "declined",
    audience: ["Student", "Team Admin"],
    title: "Refund Request declined",
    detail: "Your request for Design Basics was declined.",
    priority: "High",
    kind: "refund",
    time: "Yesterday",
  },
  {
    id: "failed",
    audience: ["Student", "Team Admin"],
    title: "Refund failed",
    detail: "The refund for Advanced TypeScript could not be issued.",
    priority: "High",
    kind: "refund",
    time: "Yesterday",
  },
  {
    id: "issued",
    audience: ["Student", "Team Admin"],
    title: "Refund issued",
    detail: "Your refund for Testing Fundamentals was issued.",
    priority: "Normal",
    kind: "refund",
    time: "2 days ago",
  },
];

type Variant = "A" | "B" | "C";

export function NotificationPrototype({ variant }: { variant: Variant }) {
  const [audience, setAudience] = useState<Audience>("Student");
  const [read, setRead] = useState<string[]>(["issued"]);
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const all = notices.filter((notice) => notice.audience.includes(audience));
  const unread = all.filter((notice) => !read.includes(notice.id)).length;
  const visible =
    filter === "Unread"
      ? all.filter((notice) => !read.includes(notice.id))
      : all;
  const selectedNotice =
    visible.find((notice) => notice.id === selected) ?? visible[0];

  function toggleRead(id: string) {
    setRead((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function controls() {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["All", "Unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {value}
            {value === "Unread" ? ` (${unread})` : ""}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto underline"
          onClick={() =>
            setRead((previous) => [
              ...new Set([...previous, ...all.map((item) => item.id)]),
            ])
          }
        >
          Mark all read
        </button>
      </div>
    );
  }

  function row(notice: Notice, compact = false) {
    const isRead = read.includes(notice.id);
    const Icon = notice.kind === "refund" ? Receipt : MessageSquare;
    return (
      <div
        key={notice.id}
        className={`flex gap-3 border-b p-3 last:border-0 ${isRead ? "" : "bg-blue-50/60 dark:bg-blue-950/25"}`}
      >
        <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{notice.title}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${notice.priority === "High" ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground"}`}
            >
              {notice.priority}
            </span>
            {!isRead && (
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{notice.detail}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{notice.time}</span>
            <button
              type="button"
              className="underline"
              onClick={() => toggleRead(notice.id)}
            >
              Mark {isRead ? "unread" : "read"}
            </button>
            {!compact && (
              <button
                type="button"
                className="underline"
                onClick={() => setSelected(notice.id)}
              >
                Preview
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const empty = (
    <p className="p-5 text-sm text-muted-foreground">
      No notifications in this view.
    </p>
  );

  return (
    <>
      <div className="relative z-20 border-b bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100">
        <div className="flex flex-wrap items-center gap-3">
          <strong>Throwaway prototype</strong>
          <span>
            Mock Knock inbox · no real delivery, links, or saved state
          </span>
          <label className="ml-auto flex items-center gap-2">
            Example recipient
            <select
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value as Audience);
                setSelected(null);
              }}
              className="rounded border bg-background px-2 py-1 text-foreground"
            >
              <option>Student</option>
              <option>Team Admin</option>
              <option>Course Owner</option>
              <option>Platform Admin</option>
            </select>
          </label>
          <span>
            {unread} unread / {all.length} total · {filter}
          </span>
        </div>
      </div>

      {variant === "A" && (
        <div className="relative z-10 flex justify-end px-6 pt-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm shadow-sm"
          >
            <Bell className="size-4" /> Notifications{" "}
            <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
              {unread}
            </span>
          </button>
          {open && (
            <section
              aria-label="Notification popover"
              className="absolute right-6 top-14 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-background shadow-xl"
            >
              <div className="space-y-3 border-b p-4">
                <div className="flex justify-between">
                  <strong>Notifications</strong>
                  <button
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {controls()}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {visible.length
                  ? visible.map((notice) => row(notice, true))
                  : empty}
              </div>
            </section>
          )}
        </div>
      )}

      {variant === "B" && (
        <>
          <div className="flex justify-end px-6 pt-3">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <Bell className="size-4" /> Open inbox ({unread})
            </button>
          </div>
          {open && (
            <section
              aria-label="Notification drawer"
              className="fixed bottom-0 right-0 top-0 z-30 flex w-[min(40rem,100vw)] flex-col border-l bg-background shadow-2xl"
            >
              <header className="space-y-3 border-b p-5">
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Your inbox</h2>
                    <p className="text-sm text-muted-foreground">
                      {unread} unread · example {audience}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close inbox"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-5" />
                  </button>
                </div>
                {controls()}
              </header>
              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                <div className="overflow-y-auto border-r sm:w-1/2">
                  {visible.length
                    ? visible.map((notice) => row(notice))
                    : empty}
                </div>
                <div className="flex-1 p-5">
                  {selectedNotice ? (
                    <>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Preview · {selectedNotice.priority} priority
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">
                        {selectedNotice.title}
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {selectedNotice.detail}
                      </p>
                      <p className="mt-4 text-xs text-muted-foreground">
                        Destination and actions are undecided.
                      </p>
                      <button
                        type="button"
                        className="mt-4 flex items-center gap-1 text-sm underline"
                        onClick={() => toggleRead(selectedNotice.id)}
                      >
                        <Check className="size-4" /> Mark{" "}
                        {read.includes(selectedNotice.id) ? "unread" : "read"}
                      </button>
                    </>
                  ) : (
                    empty
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {variant === "C" && (
        <section
          aria-label="Notification activity strip"
          className="border-b bg-muted/40 px-6 py-5"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your activity
                </div>
                <h2 className="mt-1 text-xl font-semibold">
                  Updates for you{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {unread} unread
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex items-center gap-1 text-sm underline"
              >
                {open ? "Hide updates" : "Show updates"}{" "}
                <ChevronRight className="size-4" />
              </button>
            </div>
            {open && (
              <div className="mt-4 space-y-3">
                {controls()}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visible.length
                    ? visible.map((notice) => (
                        <div
                          key={notice.id}
                          className="overflow-hidden rounded-lg border bg-background"
                        >
                          {row(notice, true)}
                        </div>
                      ))
                    : empty}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      <PrototypeSwitcher current={variant} />
    </>
  );
}
