import { desc, eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { inquiries, type Inquiry, type InquiryStatus, type NewInquiry } from "@/lib/db/schema";

export const InquiryRepository = {
  async create(data: NewInquiry, executor: DbExecutor = getDb()): Promise<Inquiry> {
    const [inquiry] = await executor.insert(inquiries).values(data).returning();
    return inquiry;
  },

  async list(filters?: { status?: InquiryStatus }, executor: DbExecutor = getDb()): Promise<Inquiry[]> {
    const query = executor.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    if (filters?.status) {
      return query.where(eq(inquiries.status, filters.status));
    }
    return query;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<Inquiry | null> {
    const [inquiry] = await executor.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    return inquiry ?? null;
  },

  async updateStatus(id: string, status: InquiryStatus, executor: DbExecutor = getDb()): Promise<Inquiry | null> {
    const [inquiry] = await executor.update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning();
    return inquiry ?? null;
  },
};
