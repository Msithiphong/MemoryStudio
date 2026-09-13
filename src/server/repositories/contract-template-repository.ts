import { eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { contractTemplates, type ContractTemplate, type NewContractTemplate } from "@/lib/db/schema";

export const ContractTemplateRepository = {
  async create(data: NewContractTemplate, executor: DbExecutor = getDb()): Promise<ContractTemplate> {
    const [template] = await executor.insert(contractTemplates).values(data).returning();
    return template;
  },

  async findActive(executor: DbExecutor = getDb()): Promise<ContractTemplate | null> {
    const [template] = await executor.select().from(contractTemplates).where(eq(contractTemplates.isActive, true)).limit(1);
    return template ?? null;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<ContractTemplate | null> {
    const [template] = await executor.select().from(contractTemplates).where(eq(contractTemplates.id, id)).limit(1);
    return template ?? null;
  },
};
