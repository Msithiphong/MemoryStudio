import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { inquiries, type Inquiry, type InquiryStatus, type NewInquiry } from "@/lib/db/schema";

export const InquiryRepository = {
  async create(data: NewInquiry): Promise<Inquiry> {
    const db = getDb();
    const [inquiry] = await db.insert(inquiries).values(data).returning();
    return inquiry;
  },

  async list(filters?: { status?: InquiryStatus }): Promise<Inquiry[]> {
    const db = getDb();
    const query = db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    if (filters?.status) {
      return query.where(eq(inquiries.status, filters.status));
    }
    return query;
  },

  async findById(id: string): Promise<Inquiry | null> {
    const db = getDb();
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    return inquiry ?? null;
  },

  async updateStatus(id: string, status: InquiryStatus): Promise<Inquiry | null> {
    const db = getDb();
    const [inquiry] = await db.update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning();
    return inquiry ?? null;
  },
};
