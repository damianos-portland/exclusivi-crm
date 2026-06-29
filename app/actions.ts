"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  getSession,
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { sendEmail } from "@/lib/email";

// ─────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────
export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Invalid login credentials." };
  }
  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ─────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────
function customerData(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    contactPerson: str(formData.get("contactPerson")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    vatNumber: str(formData.get("vatNumber")),
    address: str(formData.get("address")),
    pms: str(formData.get("pms")),
    status: String(formData.get("status") || "ACTIVE"),
    notes: str(formData.get("notes")),
  };
}

export async function createCustomer(formData: FormData) {
  await requireUser();
  const data = customerData(formData);
  if (!data.name) return;
  const c = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${c.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireUser();
  await prisma.customer.update({ where: { id }, data: customerData(formData) });
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
}

export async function deleteCustomer(id: string) {
  await requireUser();
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}

// ─────────────────────────────────────────────────────────────────
// Charges (συμφωνηθέντα ποσά)
// ─────────────────────────────────────────────────────────────────
export async function addCharge(customerId: string, formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") || "").trim();
  const amount = parseMoneyToCents(formData.get("amount") as string);
  if (!title || amount <= 0) return;
  await prisma.charge.create({
    data: {
      customerId,
      title,
      amount,
      vatRate: Number(formData.get("vatRate") || 24),
      dueDate: date(formData.get("dueDate")),
      payLink: str(formData.get("payLink")),
    },
  });
  await prisma.activity.create({
    data: { customerId, type: "STATUS", body: `New charge: ${title}` },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

export async function updateCharge(chargeId: string, customerId: string, formData: FormData) {
  await requireUser();
  await prisma.charge.update({
    where: { id: chargeId },
    data: {
      title: String(formData.get("title") || "").trim(),
      amount: parseMoneyToCents(formData.get("amount") as string),
      vatRate: Number(formData.get("vatRate") || 24),
      dueDate: date(formData.get("dueDate")),
      payLink: str(formData.get("payLink")),
    },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

export async function deleteCharge(chargeId: string, customerId: string) {
  await requireUser();
  await prisma.charge.delete({ where: { id: chargeId } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────────
// Recurring charges (επαναλαμβανόμενες)
// ─────────────────────────────────────────────────────────────────
export async function saveRecurring(customerId: string, formData: FormData) {
  await requireUser();
  const id = str(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const amount = parseMoneyToCents(formData.get("amount") as string);
  if (!title || amount <= 0) return;
  const data = {
    title,
    amount,
    vatRate: Number(formData.get("vatRate") || 24),
    interval: String(formData.get("interval") || "MONTHLY"),
    dueDays: Number(formData.get("dueDays") || 14),
    payLink: str(formData.get("payLink")),
    nextRunAt: date(formData.get("nextRunAt")) ?? new Date(),
  };
  if (id) await prisma.recurringCharge.update({ where: { id }, data });
  else await prisma.recurringCharge.create({ data: { customerId, ...data } });
  revalidatePath(`/customers/${customerId}`);
}

export async function toggleRecurring(id: string, customerId: string, active: boolean) {
  await requireUser();
  await prisma.recurringCharge.update({ where: { id }, data: { active } });
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteRecurring(id: string, customerId: string) {
  await requireUser();
  await prisma.recurringCharge.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
}

// ─────────────────────────────────────────────────────────────────
// Payments (εισπράξεις)
// ─────────────────────────────────────────────────────────────────
export async function addPayment(chargeId: string, customerId: string, formData: FormData) {
  await requireUser();
  const amount = parseMoneyToCents(formData.get("amount") as string);
  if (amount <= 0) return;
  await prisma.payment.create({
    data: {
      chargeId,
      amount,
      method: str(formData.get("method")),
      note: str(formData.get("note")),
      paidAt: date(formData.get("paidAt")) ?? new Date(),
    },
  });
  await prisma.activity.create({
    data: {
      customerId,
      type: "PAYMENT",
      body: `Payment received €${(amount / 100).toFixed(2)}`,
    },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

export async function deletePayment(paymentId: string, customerId: string) {
  await requireUser();
  await prisma.payment.delete({ where: { id: paymentId } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────────
// Activities (σημειώσεις) & Tasks
// ─────────────────────────────────────────────────────────────────
export async function addNote(customerId: string, formData: FormData) {
  await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  await prisma.activity.create({ data: { customerId, type: "NOTE", body } });
  revalidatePath(`/customers/${customerId}`);
}

export async function addTask(formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const customerId = str(formData.get("customerId"));
  await prisma.task.create({
    data: { title, customerId, dueDate: date(formData.get("dueDate")) },
  });
  if (customerId) revalidatePath(`/customers/${customerId}`);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function toggleTask(taskId: string, done: boolean) {
  await requireUser();
  await prisma.task.update({ where: { id: taskId }, data: { done } });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  await requireUser();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────
export async function saveTemplate(formData: FormData) {
  await requireUser();
  const id = str(formData.get("id"));
  const data = {
    name: String(formData.get("name") || "").trim(),
    subject: String(formData.get("subject") || "").trim(),
    body: String(formData.get("body") || ""),
  };
  if (!data.name) return;
  if (id) await prisma.emailTemplate.update({ where: { id }, data });
  else await prisma.emailTemplate.create({ data });
  revalidatePath("/templates");
}

export async function deleteTemplate(id: string) {
  await requireUser();
  await prisma.emailTemplate.delete({ where: { id } });
  revalidatePath("/templates");
}

// ─────────────────────────────────────────────────────────────────
// Senders
// ─────────────────────────────────────────────────────────────────
export async function saveSender(formData: FormData) {
  await requireUser();
  const id = str(formData.get("id"));
  const data = {
    label: String(formData.get("label") || "").trim(),
    fromName: String(formData.get("fromName") || "").trim(),
    fromEmail: String(formData.get("fromEmail") || "").trim().toLowerCase(),
  };
  if (!data.label || !data.fromEmail) return;
  if (id) await prisma.sender.update({ where: { id }, data });
  else await prisma.sender.create({ data });
  revalidatePath("/senders");
}

export async function deleteSender(id: string) {
  await requireUser();
  await prisma.sender.delete({ where: { id } });
  revalidatePath("/senders");
}

export async function setDefaultSender(id: string) {
  await requireUser();
  await prisma.$transaction([
    prisma.sender.updateMany({ data: { isDefault: false } }),
    prisma.sender.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/senders");
}

// ─────────────────────────────────────────────────────────────────
// Email αποστολή
// ─────────────────────────────────────────────────────────────────
export async function sendCustomerEmail(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const customerId = str(formData.get("customerId"));
  const senderId = String(formData.get("senderId") || "");
  const to = String(formData.get("to") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "");

  if (!to || !subject) return { error: "Missing recipient or subject." };
  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) return { error: "Choose a sender." };

  try {
    await sendEmail({
      fromName: sender.fromName,
      fromEmail: sender.fromEmail,
      to,
      subject,
      body,
    });
    await prisma.emailLog.create({
      data: {
        customerId: customerId || null,
        toEmail: to,
        fromEmail: sender.fromEmail,
        fromName: sender.fromName,
        subject,
        body,
        status: "SENT",
        kind: "MANUAL",
      },
    });
    if (customerId) {
      await prisma.activity.create({
        data: { customerId, type: "EMAIL", body: `Email sent: ${subject}` },
      });
      revalidatePath(`/customers/${customerId}`);
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send.";
    await prisma.emailLog.create({
      data: {
        customerId: customerId || null,
        toEmail: to,
        fromEmail: sender.fromEmail,
        fromName: sender.fromName,
        subject,
        body,
        status: "FAILED",
        error: message,
        kind: "MANUAL",
      },
    });
    return { error: message };
  }
}

// ── helpers ───────────────────────────────────────────────────────
function str(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}
function date(v: FormDataEntryValue | null): Date | null {
  const s = v ? String(v).trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
