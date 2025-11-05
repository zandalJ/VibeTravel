import { z } from "zod";

/**
 * Shared email schema used by auth forms.
 * Ensures trimmed value and RFC compliant email format.
 */
const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .max(255, "Email cannot exceed 255 characters")
  .email("Enter a valid email address");

/**
 * Shared password schema used by auth forms.
 * Matches PRD requirements: minimum 8 chars, at least one letter and one digit.
 */
const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

/**
 * Login form validation schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Register form validation schema.
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string({ required_error: "Confirm your password" })
      .min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Reset password request form validation schema.
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Update password form validation schema.
 */
export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string({ required_error: "Confirm your password" })
      .min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

/**
 * Union type with minimal fields for informational banners on forms.
 */
export type AuthFeedbackState = {
  status: "success" | "error";
  message: string;
} | null;

export const authEventSchema = z.enum(["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "PASSWORD_RECOVERY"], {
  invalid_type_error: "Invalid authentication event.",
});

export const authSessionPayloadSchema = z
  .object({
    access_token: z.string().min(1, "Access token is required"),
    refresh_token: z.string().min(1, "Refresh token is required"),
    expires_at: z.number().int().nonnegative().optional(),
    token_type: z.string().optional(),
    user: z
      .object({
        id: z.string().min(1, "User id is required"),
        email: z.string().email().nullable().optional(),
      })
      .optional(),
  })
  .passthrough();

export type AuthEvent = z.infer<typeof authEventSchema>;
export type AuthSessionPayload = z.infer<typeof authSessionPayloadSchema>;

