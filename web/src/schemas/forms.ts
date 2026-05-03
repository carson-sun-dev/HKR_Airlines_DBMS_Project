import { z } from "zod";

/** Client-side validation before API submit */
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    username: z.string().trim().min(2, "Username must be at least 2 characters").max(64),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["C", "E"], { message: "Role must be policyholder or employee" }),
    customer_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "C") return;
    const id = Number(String(data.customer_id ?? "").trim());
    if (!Number.isInteger(id) || id <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid customer ID that matches your account record",
        path: ["customer_id"],
      });
    }
  });

export const customerIdParamSchema = z.coerce.number().int().positive();

export const overviewStatsSchema = z.object({
  auto_policy_count: z.number().nonnegative(),
  auto_premium_total: z.number().nonnegative(),
  home_policy_count: z.number().nonnegative(),
  home_premium_total: z.number().nonnegative(),
  customer_count: z.number().nonnegative(),
});
