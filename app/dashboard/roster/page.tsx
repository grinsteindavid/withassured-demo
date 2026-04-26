import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RosterPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Provider Roster</h1>
      <div className="rounded border p-4">
        <p className="text-gray-600">Provider roster management will appear here.</p>
      </div>
    </div>
  );
}
