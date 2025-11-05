import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthFeedback } from "@/components/auth/AuthFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  loginSchema,
  type AuthFeedbackState,
  type LoginFormValues,
} from "@/lib/validators/auth.validator";
import { getSupabaseBrowserClient } from "@/db/supabase.client";

export interface LoginFormProps {
  heading?: string;
  description?: string;
  defaultValues?: Partial<LoginFormValues>;
  onSubmit?: (values: LoginFormValues) => Promise<void> | void;
  className?: string;
}

const defaultHeading = "Zaloguj się";
const defaultDescription = "Uzyskaj dostęp do zaplanowanych podróży i notatek.";

export function LoginForm({ heading, description, defaultValues, onSubmit, className }: LoginFormProps) {
  const [feedback, setFeedback] = useState<AuthFeedbackState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultValues?.email ?? "",
      password: "",
    },
  });

  const syncSession = useCallback(async (session: Session) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "SIGNED_IN",
        session,
      }),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Nie udało się zsynchronizować sesji. Spróbuj ponownie.");
    }
  }, []);

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(values);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        setFeedback({
          status: "error",
          message: "Nieprawidłowy email lub hasło. Spróbuj ponownie.",
        });
        return;
      }

      if (!data.session) {
        setFeedback({
          status: "error",
          message: "Nie udało się uwierzytelnić użytkownika. Spróbuj ponownie.",
        });
        return;
      }

      await syncSession(data.session);

      window.location.assign("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Coś poszło nie tak. Spróbuj ponownie.";
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
                    <Input type="email" placeholder="jan.kowalski@example.com" autoComplete="email" {...field} disabled={isSubmitting} />
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
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button asChild variant="link" size="sm" className="px-0 font-normal">
                <a href="/auth/reset">Nie pamiętasz hasła?</a>
              </Button>
            </div>

            <AuthFeedback feedback={feedback} />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Nie masz jeszcze konta? {" "}
          <Button asChild variant="link" size="sm" className="px-0">
            <a href="/auth/register">Załóż konto</a>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

