export function renderContractTemplate(sourceContent: string, fields: Record<string, string>): string {
  return sourceContent.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!(key in fields)) {
      throw new Error(`Unknown contract template placeholder: {{${key}}}`);
    }
    return fields[key];
  });
}
