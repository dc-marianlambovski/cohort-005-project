import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { createTestDb, seedBaseData } from "~/test/setup";
import { getBookmark, getNote, saveNote } from "~/lib/saved.server";
import { action, loader } from "./courses.$slug.lessons.$lessonId";
import { loader as rosterLoader } from "./instructor.$courseId.students";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let lessonId: number;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));
vi.mock("~/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/session")>()),
  getCurrentUserId: async (request: Request) => {
    const id = request.headers.get("x-test-user");
    return id ? Number(id) : null;
  },
}));
vi.mock("~/lib/country.server", () => ({
  resolveCountry: async () => "US",
}));

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);
  const module = testDb
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  lessonId = testDb
    .insert(schema.lessons)
    .values({
      moduleId: module.id,
      title: "Lesson",
      content: "private lesson content",
      videoUrl: "https://example.com/video",
      githubRepoUrl: "https://example.com/code",
      position: 1,
    })
    .returning()
    .get().id;
});

function request(userId: number | null, form?: Record<string, string>) {
  return new Request("http://localhost/lesson", {
    method: form ? "POST" : "GET",
    headers: userId ? { "x-test-user": String(userId) } : {},
    body: form ? new URLSearchParams(form) : undefined,
  });
}

function lessonArgs(
  userId: number | null,
  form?: Record<string, string>,
  slug = "test-course"
) {
  return {
    request: request(userId, form),
    params: { slug, lessonId: String(lessonId) },
    context: new RouterContextProvider(),
    url: new URL("http://localhost/lesson"),
    pattern: "/courses/:slug/lessons/:lessonId",
  };
}

describe("saved lesson access", () => {
  it("rejects bookmark and note actions without content access", async () => {
    for (const intent of ["toggle-bookmark", "save-note"]) {
      await expect(
        action(lessonArgs(null, { intent, body: "private" }))
      ).rejects.toMatchObject({ init: { status: 401 } });
      await expect(
        action(lessonArgs(base.user.id, { intent, body: "private" }))
      ).rejects.toMatchObject({ init: { status: 403 } });
    }
    expect(getBookmark(testDb, base.user.id, lessonId)).toBeUndefined();
    expect(getNote(testDb, base.user.id, lessonId)).toBeUndefined();
  });

  it("allows an enrolled student to save, toggle, and read their own note", async () => {
    testDb
      .insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    expect(
      await action(lessonArgs(base.user.id, { intent: "toggle-bookmark" }))
    ).toMatchObject({ bookmarked: true });
    expect(
      await action(
        lessonArgs(base.user.id, { intent: "save-note", body: "  my note  " })
      )
    ).toMatchObject({ noteSaved: true });
    const result = await loader(lessonArgs(base.user.id));
    expect(result.bookmarked).toBe(true);
    expect(result.note).toMatchObject({ body: "my note" });
    await expect(
      action(
        lessonArgs(base.user.id, {
          intent: "save-note",
          body: "x".repeat(2001),
        })
      )
    ).rejects.toMatchObject({
      data: "Note must be 2000 characters or fewer.",
      init: { status: 400 },
    });
    expect(getNote(testDb, base.user.id, lessonId)?.body).toBe("my note");
  });

  it("rejects both actions and hides content when PPP access is blocked", async () => {
    testDb
      .update(schema.courses)
      .set({ price: 7900 })
      .where(eq(schema.courses.id, base.course.id))
      .run();
    testDb
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 3950,
        country: "IN",
      })
      .run();
    testDb
      .insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    saveNote(testDb, base.user.id, lessonId, "private note", new Date());
    for (const intent of ["toggle-bookmark", "save-note"]) {
      await expect(
        action(lessonArgs(base.user.id, { intent, body: "private" }))
      ).rejects.toMatchObject({ init: { status: 403 } });
    }
    const result = await loader(lessonArgs(base.user.id));
    expect(result.pppBlocked).toBe(true);
    expect(result.note).toBeNull();
    expect(result.lesson.content).toBeNull();
    expect(result.lesson.videoUrl).toBeNull();
  });

  it("rejects attempts to use access to another course", async () => {
    const otherCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Other",
        slug: "other",
        description: "Other course",
        salesCopy: "Other",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();
    testDb
      .insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: otherCourse.id })
      .run();

    for (const intent of ["toggle-bookmark", "save-note"]) {
      await expect(
        action(lessonArgs(base.user.id, { intent, body: "private" }, "other"))
      ).rejects.toMatchObject({ init: { status: 404 } });
    }
    expect(getNote(testDb, base.user.id, lessonId)).toBeUndefined();
    expect(getBookmark(testDb, base.user.id, lessonId)).toBeUndefined();
  });

  it("withholds note and lesson content after access is lost", async () => {
    saveNote(testDb, base.user.id, lessonId, "private note", new Date());
    for (const userId of [base.user.id, null]) {
      const result = await loader(lessonArgs(userId));
      expect(result.note).toBeNull();
      expect(result.contentHtml).toBeNull();
      expect(result.lesson).toMatchObject({
        content: null,
        videoUrl: null,
        githubRepoUrl: null,
      });
      expect(result.quiz).toBeNull();
    }
  });

  it("does not include student notes in instructor or admin rosters", async () => {
    testDb
      .insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    saveNote(testDb, base.user.id, lessonId, "private note", new Date());
    const admin = testDb
      .insert(schema.users)
      .values({
        name: "Admin",
        email: "admin@example.com",
        role: schema.UserRole.Admin,
      })
      .returning()
      .get();
    for (const userId of [base.instructor.id, admin.id]) {
      const result = await rosterLoader({
        request: request(userId),
        params: { courseId: String(base.course.id) },
        context: new RouterContextProvider(),
        url: new URL("http://localhost/lesson"),
        pattern: "/instructor/:courseId/students",
      });
      expect(result.students).toHaveLength(1);
      expect(JSON.stringify(result)).not.toContain("private note");
      expect(result.students[0]).not.toHaveProperty("notes");
    }
  });
});
