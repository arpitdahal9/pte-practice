import { redirect } from "next/navigation";

/** Auth removed — send old login links into the open app. */
export default function LoginPage() {
  redirect("/practice");
}
