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
  registerSchema,
  type AuthFeedbackState,
  type RegisterFormValues,
} from "@/lib/validators/auth.validator";

export interface RegisterFormProps {
  heading?: string;
  description?: string;
  onSubmit?: (values: RegisterFormValues) => Promise<void> | void;
  className?: string;
}

const defaultHeading = "Załóż konto";
const defaultDescription = "Dołącz do VibeTravel i zacznij planować wymarzone podróże.";

export function RegisterForm({ heading, description, onSubmit, className }: RegisterFormProps) {
  const [feedback, setFeedback] = useState<AuthFeedbackState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
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
        message: "Konto zostało utworzone (placeholder). Integracja z backendem nastąpi w kolejnych krokach.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zarejestrować. Spróbuj ponownie.";
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="minimum 8 znaków"
                      autoComplete="new-password"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powtórz hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="potwierdź hasło"
                      autoComplete="new-password"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Rejestrując konto akceptujesz regulamin VibeTravel. Szczegółowe warunki i politykę prywatności dodamy podczas integracji z backendem.
            </p>

            <AuthFeedback feedback={feedback} />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Zakładanie konta..." : "Załóż konto"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Button asChild variant="link" size="sm" className="px-0">
            <a href="/auth/login">Zaloguj się</a>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

