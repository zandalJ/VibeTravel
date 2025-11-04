"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthFeedback } from "@/components/auth/AuthFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  resetPasswordSchema,
  type AuthFeedbackState,
  type ResetPasswordFormValues,
} from "@/lib/validators/auth.validator";

export interface ResetPasswordFormProps {
  heading?: string;
  description?: string;
  onSubmit?: (values: ResetPasswordFormValues) => Promise<void> | void;
  className?: string;
}

const defaultHeading = "Resetuj hasło";
const defaultDescription = "Podaj adres e-mail powiązany z kontem. Jeśli istnieje, wyślemy dalsze instrukcje.";

export function ResetPasswordForm({ heading, description, onSubmit, className }: ResetPasswordFormProps) {
  const [feedback, setFeedback] = useState<AuthFeedbackState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(values);
        return;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });

      setFeedback({
        status: "success",
        message: "Jeśli konto istnieje, w ciągu kilku minut otrzymasz wiadomość e-mail.",
      });
      form.reset({ email: values.email });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się wysłać wiadomości. Spróbuj ponownie.";
      setFeedback({ status: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold">{heading ?? defaultHeading}</CardTitle>
        <CardDescription>{description ?? defaultDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres e-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="twoj.mail@example.com" autoComplete="email" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>Nie ujawniamy, czy adres istnieje w naszej bazie.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AuthFeedback feedback={feedback} />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Wysyłanie..." : "Wyślij instrukcje"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button asChild variant="link" size="sm" className="px-0">
          <a href="/auth/login">Wróć do logowania</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

