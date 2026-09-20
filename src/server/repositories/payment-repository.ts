import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { payments, type NewPayment, type Payment, type PaymentType } from "@/lib/db/schema";

/** Statuses that represent money actually received and still held (refund tracking is a later phase). */
const RECEIVED_STATUSES = ["paid", "partially_refunded"] as const;

export const PaymentRepository = {
  async create(data: NewPayment, executor: DbExecutor = getDb()): Promise<Payment> {
    const [payment] = await executor.insert(payments).values(data).returning();
    return payment;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<Payment | null> {
    const [payment] = await executor.select().from(payments).where(eq(payments.id, id)).limit(1);
    return payment ?? null;
  },

  /** Row-locks the payment for the rest of the transaction so concurrent webhook deliveries serialize. */
  async findByIdForUpdate(id: string, executor: DbExecutor): Promise<Payment | null> {
    const [payment] = await executor.select().from(payments).where(eq(payments.id, id)).for("update").limit(1);
    return payment ?? null;
  },

  async findPending(bookingId: string, paymentType: PaymentType, executor: DbExecutor = getDb()): Promise<Payment | null> {
    const [payment] = await executor
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.paymentType, paymentType), eq(payments.status, "pending")))
      .limit(1);
    return payment ?? null;
  },

  async listForBooking(bookingId: string, executor: DbExecutor = getDb()): Promise<Payment[]> {
    return executor.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt));
  },

  async sumReceivedCents(bookingId: string, paymentType: PaymentType, executor: DbExecutor = getDb()): Promise<number> {
    const [row] = await executor
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents} - ${payments.refundedCents}), 0)::int` })
      .from(payments)
      .where(
        and(eq(payments.bookingId, bookingId), eq(payments.paymentType, paymentType), inArray(payments.status, [...RECEIVED_STATUSES])),
      );
    return row?.total ?? 0;
  },

  async attachCheckoutSession(id: string, checkoutSessionId: string, executor: DbExecutor = getDb()): Promise<Payment | null> {
    const [payment] = await executor
      .update(payments)
      .set({ stripeCheckoutSessionId: checkoutSessionId })
      .where(and(eq(payments.id, id), eq(payments.status, "pending")))
      .returning();
    return payment ?? null;
  },

  /** Only a still-pending attempt can be cancelled/failed — a paid payment is never rewritten. */
  async closePending(id: string, status: "cancelled" | "failed", executor: DbExecutor = getDb()): Promise<Payment | null> {
    const [payment] = await executor
      .update(payments)
      .set({ status })
      .where(and(eq(payments.id, id), eq(payments.status, "pending")))
      .returning();
    return payment ?? null;
  },

  async markPaid(
    id: string,
    data: { amountCents: number; paidAt: Date; stripePaymentIntentId: string | null; manualReviewReason: string | null },
    executor: DbExecutor = getDb(),
  ): Promise<Payment | null> {
    const [payment] = await executor
      .update(payments)
      .set({
        status: "paid",
        amountCents: data.amountCents,
        paidAt: data.paidAt,
        stripePaymentIntentId: data.stripePaymentIntentId,
        manualReviewReason: data.manualReviewReason,
      })
      .where(and(eq(payments.id, id), inArray(payments.status, ["pending", "cancelled", "failed"])))
      .returning();
    return payment ?? null;
  },

  async setManualReviewReason(id: string, reason: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.update(payments).set({ manualReviewReason: reason }).where(eq(payments.id, id));
  },
};
