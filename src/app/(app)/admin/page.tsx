import { requirePageAdmin } from "@/lib/session";
import { AdminQuestions } from "./admin-questions";

export const metadata = { title: "Admin — PTE Practice" };

export default async function AdminPage() {
  await requirePageAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question bank</h1>
        <p className="text-muted-foreground">
          Create, edit and delete practice questions. All content is style-alike
          sample material — never label it as official PTE.
        </p>
      </div>
      <AdminQuestions />
    </div>
  );
}
