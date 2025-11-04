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
  updatePasswordSchema,
  type AuthFeedbackState,
  type UpdatePasswordFormValues,
} from "@/lib/validators/auth.validator";

export interface UpdatePasswordFormProps {
  heading?: string;
  description?: string;
  onSubmit?: (values: UpdatePasswordFormValues) => Promise<void> | void;
  className?: string;
}

const defaultHeading = "Ustaw nowe hasło";
const defaultDescription = "Zadbaj o silne hasło. Po zapisaniu zostaniesz przeniesiony do panelu.";

export function UpdatePasswordForm({ heading, description, onSubmit, className }: UpdatePasswordFormProps) {
  const [feedback, setFeedback] = useState<AuthFeedbackState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
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
        message: "Hasło zostało zaktualizowane (placeholder). Dodamy przekierowanie po implementacji backendu.",
      });
      form.reset({ password: "", confirmPassword: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Zmiana hasła nie powiodła się. Spróbuj ponownie.";
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nowe hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="minimum 8 znaków"
                      autoComplete="new-password"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Hasło powinno zawierać litery i cyfry.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powtórz nowe hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="powtórz hasło"
                      autoComplete="new-password"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AuthFeedback feedback={feedback} />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Zapisywanie..." : "Zapisz nowe hasło"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <p>Po implementacji backendu przekierujemy Cię automatycznie po udanej zmianie hasła.</p>
        <Button asChild variant="link" size="sm" className="px-0">
          <a href="/auth/login">Powrót do logowania</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

