import { redirect } from "next/navigation";

/** Auth removed — send old register links into the open app. */
export default function RegisterPage() {
  redirect("/practice");
}
