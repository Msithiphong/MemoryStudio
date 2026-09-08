import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentAdmin } from "@/server/auth/get-current-admin";
import { signOutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentAdmin();
  if (!current) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <nav className="flex items-center gap-6">
            <Link href="/admin/inquiries" className="text-sm font-semibold tracking-tight">
              Memory Studio Admin
            </Link>
            <Link href="/admin/inquiries" className="text-sm text-muted-foreground hover:text-foreground">
              Inquiries
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{current.email}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
