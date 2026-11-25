import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import {
  saveConfirmationJob,
  sendConfirmation,
} from "@/server/reports/confirmation";
import { sendMail } from "@/server/reports/mailer";

vi.mock("@/server/reports/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue({ rejected: [] }),
}));
afterEach(() => vi.unstubAllEnvs());

it("defaults off and delivers one short email with a signed PDF link when enabled", async () => {
  vi.stubEnv("SESSION_SECRET", "test-confirmation-secret");
  vi.stubEnv("APP_BASE_URL", "https://warehouse.example.test");
  const key = "confirmationEmail";
  const actor = await db.user.create({
    data: { name: "Keeper", username: randomUUID(), role: "KEEPER" },
  });
  const customer = await db.customer.create({ data: { nameAr: "اختبار" } });
  const note = await db.issueNote.create({
    data: {
      status: "CONFIRMED",
      number: 851321,
      date: new Date(),
      customerId: customer.id,
      createdById: actor.id,
    },
  });
  const where = { type_period: { type: "confirmation", period: note.id } };
  try {
    await db.$transaction((tx) => saveConfirmationJob(tx, note.id));
    expect(await db.reportLog.findUnique({ where })).toBeNull();
    await db.setting.create({
      data: {
        key,
        value: { enabled: true, recipients: ["owner@example.test"] },
      },
    });
    await db.$transaction((tx) => saveConfirmationJob(tx, note.id));
    await Promise.all([sendConfirmation(note.id), sendConfirmation(note.id)]);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["owner@example.test"],
        subject: expect.stringContaining("851321"),
        html: expect.stringContaining(
          "https://warehouse.example.test/api/reports/pdf/" + note.id,
        ),
      }),
    );
    expect((await db.reportLog.findUnique({ where }))?.status).toBe("sent");
  } finally {
    await db.reportLog.deleteMany({
      where: { type: "confirmation", period: note.id },
    });
    await db.setting.deleteMany({ where: { key } });
    await db.issueNote.delete({ where: { id: note.id } });
    await db.customer.delete({ where: { id: customer.id } });
    await db.user.delete({ where: { id: actor.id } });
  }
});
