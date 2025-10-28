import { useNoteForm } from "@/components/hooks/useNoteForm";
import { useCallback, useState } from "react";
import { DatePicker } from "./DatePicker";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NoteDTO } from "@/types";

interface NoteFormProps {
  onSuccess?: (note: NoteDTO) => void;
  onCancel?: () => void;
}

/**
 * NoteForm component for creating travel notes
 * Uses react-hook-form with Zod validation
 * Calls POST /api/notes endpoint
 */
export function NoteForm({ onSuccess, onCancel }: NoteFormProps) {
  const [createdNote, setCreatedNote] = useState<NoteDTO | null>(null);

  const handleSuccess = useCallback(
    (note: NoteDTO) => {
      setCreatedNote(note);

      if (onSuccess) {
        onSuccess(note);
      }
    },
    [onSuccess]
  );

  const { form, onSubmit, isSubmitting, error } = useNoteForm({
    onSuccess: handleSuccess,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {createdNote && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="space-y-3">
            <div>
              <p className="text-base font-semibold">Travel note created successfully!</p>
              <p className="text-sm text-emerald-700">What would you like to do next?</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="/dashboard">Return to dashboard</a>
              </Button>
              <Button asChild>
                <a href={`/notes/${createdNote.id}`}>Open created note</a>
              </Button>
            </div>
          </div>
        </div>
      )}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setCreatedNote(null);
            await onSubmit(values);
          })}
          className="space-y-6"
        >
          {/* Destination Field */}
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Paris, France" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormDescription>Where do you want to travel?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Fields Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date Field */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        field.onChange(date ? date.toISOString().split("T")[0] : "");
                      }}
                      placeholder="Select start date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>When does your trip start?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date Field */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        field.onChange(date ? date.toISOString().split("T")[0] : "");
                      }}
                      placeholder="Select end date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>When does your trip end?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Total Budget Field */}
          <FormField
            control={form.control}
            name="total_budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Budget (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2000"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : Number(value));
                    }}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>What's your total budget for this trip?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional Notes Field */}
          <FormField
            control={form.control}
            name="additional_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any special requirements, preferences, or notes about your trip..."
                    className="min-h-[120px] resize-y"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Any additional information to help plan your trip (max 10,000 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Note"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
