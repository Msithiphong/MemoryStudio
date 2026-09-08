import Link from "next/link";

import { listInquiries } from "@/server/services/inquiries";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InquiryStatus } from "@/lib/db/schema";

const STATUS_FILTERS: { label: string; value: InquiryStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Declined", value: "declined" },
  { label: "Converted", value: "converted" },
];

const STATUS_VARIANTS: Record<InquiryStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewing: "secondary",
  waitlisted: "outline",
  declined: "destructive",
  converted: "secondary",
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = STATUS_FILTERS.some((f) => f.value === status) && status !== "all" ? (status as InquiryStatus) : undefined;

  const inquiries = await listInquiries(validStatus ? { status: validStatus } : undefined);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>

      <nav className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const href = filter.value === "all" ? "/admin/inquiries" : `/admin/inquiries?status=${filter.value}`;
          const isActive = (filter.value === "all" && !validStatus) || filter.value === validStatus;
          return (
            <Link
              key={filter.value}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm ${
                isActive ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Event date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No inquiries yet.
                </TableCell>
              </TableRow>
            ) : (
              inquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell>
                    <Link href={`/admin/inquiries/${inquiry.id}`} className="hover:underline">
                      {inquiry.firstName} {inquiry.lastName ?? ""}
                    </Link>
                  </TableCell>
                  <TableCell>{inquiry.email}</TableCell>
                  <TableCell>{inquiry.eventDate}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[inquiry.status]}>{inquiry.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(inquiry.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
