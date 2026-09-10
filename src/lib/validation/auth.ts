import { z } from "zod";

/**
 * Passwords are trimmed on BOTH register and login, deliberately and
 * symmetrically.
 *
 * Email was already trimmed, but password was not, so a credential pasted with
 * a stray leading/trailing space (very easy to do when copying a demo login out
 * of terminal output) failed as "Invalid email or password" — indistinguishable
 * from genuinely wrong credentials.
 *
 * Trimming only one side would be worse than trimming neither: someone who
 * registered with " secret" would be permanently locked out. Because register
 * trims too, no stored hash can have edge whitespace, so the two sides cannot
 * disagree.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
