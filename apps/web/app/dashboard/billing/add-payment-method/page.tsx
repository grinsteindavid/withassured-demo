import { AddPaymentMethod } from "@/components/dashboard/billing/add-payment-method";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function AddPaymentMethodPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Add Payment Method</h1>
      <AddPaymentMethod />
    </div>
  );
}
