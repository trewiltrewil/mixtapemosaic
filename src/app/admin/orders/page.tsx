import Link from "next/link";
import { AdminOrdersPanel } from "@/components/AdminOrdersPanel";

export const metadata = {
  title: "Orders & UV Print Files | Mixtape Mosaic Admin"
};

export default function AdminOrdersPage() {
  return (
    <>
      <div className="admin-backbar">
        <Link href="/admin">Back to admin</Link>
      </div>
      <AdminOrdersPanel />
    </>
  );
}
