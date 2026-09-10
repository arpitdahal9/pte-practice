import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

/**
 * A credential pasted with stray whitespace used to fail as "Invalid email or
 * password", which is indistinguishable from a genuinely wrong password and
 * sent debugging in entirely the wrong direction.
 */
describe("login accepts pasted credentials with stray whitespace", () => {
  it("trims a trailing space from the password", () => {
    const r = loginSchema.safeParse({
      email: "admin@ptepractice.local",
      password: "Password123! ",
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.password).toBe("Password123!");
  });

  it("trims a leading space from the password", () => {
    const r = loginSchema.safeParse({
      email: "admin@ptepractice.local",
      password: " Password123!",
    });
    expect(r.success && r.data.password).toBe("Password123!");
  });

  it("still normalises the email", () => {
    const r = loginSchema.safeParse({
      email: "  ADMIN@PTEPractice.local ",
      password: "Password123!",
    });
    expect(r.success && r.data.email).toBe("admin@ptepractice.local");
  });

  it("rejects a password that is only whitespace", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "   " }).success,
    ).toBe(false);
  });
});

describe("register trims symmetrically", () => {
  it("stores the trimmed password so login can never disagree", () => {
    const r = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: " correct horse ",
    });
    expect(r.success && r.data.password).toBe("correct horse");
  });

  it("counts length after trimming, not before", () => {
    // "  abc  " is 7 chars raw but 3 trimmed — must fail the 8-char minimum.
    expect(
      registerSchema.safeParse({
        name: "T",
        email: "t@e.com",
        password: "  abc  ",
      }).success,
    ).toBe(false);
  });
});
