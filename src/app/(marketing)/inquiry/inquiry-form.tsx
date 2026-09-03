"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  EVENT_TYPE_OPTIONS,
  PACKAGE_INTEREST_OPTIONS,
  inquirySchema,
  type InquiryFormInput,
  type InquiryFormOutput,
} from "@/lib/validation/inquiry";
import { submitInquiryAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPE_OPTIONS)[number], string> = {
  wedding: "Wedding",
  engagement: "Engagement",
  other: "Other",
};

export function InquiryForm() {
  const [formRenderedAt] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<InquiryFormInput, unknown, InquiryFormOutput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { eventType: "wedding" },
  });

  function onSubmit(values: InquiryFormOutput) {
    setFormError(null);
    startTransition(async () => {
      const result = await submitInquiryAction({ ...values, formRenderedAt });

      if (result.ok) {
        setSubmitted(true);
        return;
      }

      if (result.formError) setFormError(result.formError);
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(field as FieldPath<InquiryFormInput>, { message });
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6">
        <h2 className="text-xl font-semibold">Thanks — we&apos;ve got it.</h2>
        <p className="mt-2 text-muted-foreground">
          We review every inquiry by hand and will follow up soon to confirm availability. Submitting this form
          doesn&apos;t reserve your date — nothing is booked until we confirm with you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* Honeypot — hidden from real visitors, bots often fill it in */}
      <div aria-hidden="true" className="hidden">
        <Label htmlFor="companyWebsite">Company Website</Label>
        <Input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Your first name</Label>
          <Input id="firstName" className="mt-1.5" aria-invalid={!!errors.firstName} {...register("firstName")} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="lastName">Your last name</Label>
          <Input id="lastName" className="mt-1.5" {...register("lastName")} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="partnerFirstName">Partner&apos;s first name</Label>
          <Input id="partnerFirstName" className="mt-1.5" {...register("partnerFirstName")} />
        </div>
        <div>
          <Label htmlFor="partnerLastName">Partner&apos;s last name</Label>
          <Input id="partnerLastName" className="mt-1.5" {...register("partnerLastName")} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" className="mt-1.5" {...register("phone")} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="eventDate">Event date</Label>
          <Input
            id="eventDate"
            type="date"
            className="mt-1.5"
            aria-invalid={!!errors.eventDate}
            {...register("eventDate")}
          />
          <FieldError message={errors.eventDate?.message} />
        </div>
        <div>
          <Label htmlFor="eventType">Event type</Label>
          <Controller
            control={control}
            name="eventType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="eventType" className="mt-1.5 w-full">
                  <SelectValue placeholder="Select an event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {EVENT_TYPE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <Label htmlFor="venueName">Venue name</Label>
          <Input id="venueName" className="mt-1.5" {...register("venueName")} />
        </div>
        <div>
          <Label htmlFor="venueCity">Venue city</Label>
          <Input id="venueCity" className="mt-1.5" {...register("venueCity")} />
        </div>
        <div>
          <Label htmlFor="venueState">Venue state</Label>
          <Input id="venueState" className="mt-1.5" {...register("venueState")} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="estimatedGuestCount">Estimated guest count</Label>
          <Input
            id="estimatedGuestCount"
            type="number"
            min={1}
            className="mt-1.5"
            aria-invalid={!!errors.estimatedGuestCount}
            {...register("estimatedGuestCount")}
          />
          <FieldError message={errors.estimatedGuestCount?.message} />
        </div>
        <div>
          <Label htmlFor="packageInterest">Package interest</Label>
          <Controller
            control={control}
            name="packageInterest"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="packageInterest" className="mt-1.5 w-full">
                  <SelectValue placeholder="Not sure yet" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_INTEREST_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="message">Anything else we should know?</Label>
        <Textarea
          id="message"
          className="mt-1.5"
          rows={4}
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        <FieldError message={errors.message?.message} />
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send Inquiry"}
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          Sending an inquiry does not reserve your date. We review every request and follow up to confirm
          availability before anything is booked.
        </p>
      </div>
    </form>
  );
}
