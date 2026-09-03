import { getDb } from "@/lib/db";
import { inquiries, type Inquiry, type NewInquiry } from "@/lib/db/schema";

export const InquiryRepository = {
  async create(data: NewInquiry): Promise<Inquiry> {
    const db = getDb();
    const [inquiry] = await db.insert(inquiries).values(data).returning();
    return inquiry;
  },
};
