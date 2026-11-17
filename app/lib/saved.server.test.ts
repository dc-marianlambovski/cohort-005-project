import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { createTestDb, seedBaseData } from "~/test/setup";
import { fakeNotifications } from "~/lib/notifications.fake.server";
import { approveRefundRequest, raiseRefundRequest } from "~/lib/refunds.server";
import {
  getBookmark,
  getNote,
  getSavedBookmarks,
  getSavedNotes,
  saveNote,
  toggleBookmark,
} from "./saved.server";

const first = new Date("2026-10-01T10:00:00.000Z");
const later = new Date("2026-10-02T10:00:00.000Z");
let db: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

describe("bookmarks and notes", () => {
  it("toggles a single bookmark on and off", () => {
    expect(toggleBookmark(db, base.user.id, lessonIds[0], first)).toBe(true);
    expect(getBookmark(db, base.user.id, lessonIds[0])).toBeDefined();
    expect(getSavedBookmarks(db, base.user.id)).toHaveLength(1);
    expect(toggleBookmark(db, base.user.id, lessonIds[0], later)).toBe(false);
    expect(getBookmark(db, base.user.id, lessonIds[0])).toBeUndefined();
    expect(toggleBookmark(db, base.user.id, lessonIds[0], later)).toBe(true);
    expect(getSavedBookmarks(db, base.user.id)).toHaveLength(1);
  });

  it("replaces a trimmed note and updates its edit time without creating another", () => {
    saveNote(db, base.user.id, lessonIds[0], "  first\nnote  ", first);
    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "first\nnote",
      createdAt: first.toISOString(),
      updatedAt: first.toISOString(),
    });

    saveNote(db, base.user.id, lessonIds[0], "  # revised *text*  ", later);
    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "# revised *text*",
      createdAt: first.toISOString(),
      updatedAt: later.toISOString(),
    });
    expect(getSavedNotes(db, base.user.id)).toHaveLength(1);
  });

  it("accepts 2,000 characters and refuses longer notes without overwriting", () => {
    saveNote(db, base.user.id, lessonIds[0], "x".repeat(2000), first);
    expect(() =>
      saveNote(db, base.user.id, lessonIds[0], "x".repeat(2001), later)
    ).toThrow("2000 characters or fewer");
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(
      "x".repeat(2000)
    );
  });

  it("lists only the owner's rows, newest first, with their lesson and course", () => {
    const other = db
      .insert(schema.users)
      .values({
        name: "Other",
        email: "other@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
    toggleBookmark(db, base.user.id, lessonIds[0], first);
    toggleBookmark(db, base.user.id, lessonIds[1], later);
    toggleBookmark(db, other.id, lessonIds[0], later);
    saveNote(db, base.user.id, lessonIds[1], "older", first);
    saveNote(db, base.user.id, lessonIds[0], "newer", later);
    saveNote(db, other.id, lessonIds[0], "private", later);

    expect(getSavedBookmarks(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      {
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
    ]);
    expect(getSavedNotes(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        body: "newer",
      },
      {
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        body: "older",
      },
    ]);
    expect(getNote(db, other.id, lessonIds[0])?.body).toBe("private");
  });

  it("keeps saved items after approving a refund", async () => {
    const purchase = db
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 7900,
        createdAt: first.toISOString(),
      })
      .returning()
      .get();
    db.insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    const admin = db
      .insert(schema.users)
      .values({
        name: "Admin",
        email: "admin@example.com",
        role: schema.UserRole.Admin,
      })
      .returning()
      .get();
    toggleBookmark(db, base.user.id, lessonIds[0], first);
    saveNote(db, base.user.id, lessonIds[0], "my note", first);
    const notifications = fakeNotifications();
    const request = await raiseRefundRequest(
      db,
      purchase.id,
      base.user.id,
      "Not for me",
      later,
      notifications
    );
    if (!request.ok) throw new Error(request.error);

    expect(
      (
        await approveRefundRequest(
          db,
          request.refundRequestId,
          admin.id,
          null,
          later,
          notifications
        )
      ).ok
    ).toBe(true);
    expect(
      db
        .select()
        .from(schema.enrollments)
        .where(eq(schema.enrollments.userId, base.user.id))
        .all()
    ).toHaveLength(0);
    expect(getSavedBookmarks(db, base.user.id)).toMatchObject([
      { lessonId: lessonIds[0] },
    ]);
    expect(getSavedNotes(db, base.user.id)).toMatchObject([
      { lessonId: lessonIds[0], body: "my note" },
    ]);
  });
});
