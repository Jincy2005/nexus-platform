"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "@/actions/profile";
import { PURPOSE_OPTIONS } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const purposeLabels: Record<(typeof PURPOSE_OPTIONS)[number], string> = {
  personal: "Personal networking",
  professional: "Professional networking",
  business: "Business",
  education: "Education",
  creation: "Content creation",
  communities: "Communities",
};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, null);

  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" name="fullName" defaultValue={defaultName} required />
      <Field label="Username" name="username" required placeholder="maya_chen" />
      <div className="space-y-2">
        <Label htmlFor="photo">Profile photo</Label>
        <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Short biography</Label>
        <Textarea id="bio" name="bio" maxLength={280} />
      </div>
      <Field label="Location (optional)" name="location" />
      <Field label="Professional role" name="professionalRole" placeholder="Product designer" />
      <Field label="Headline" name="headline" />
      <Field label="Interests (comma-separated)" name="interests" placeholder="design, climate, jazz" />
      <Field label="Skills (comma-separated)" name="skills" placeholder="TypeScript, facilitation" />
      <Field label="Education (optional)" name="education" />
      <Field label="Work (optional)" name="work" />
      <Field label="Networking goals (comma-separated)" name="networkingGoals" placeholder="mentorship, hiring, friends" />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">I am here for</legend>
        <div className="grid grid-cols-2 gap-2">
          {PURPOSE_OPTIONS.map((purpose) => (
            <label key={purpose} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="purposes" value={purpose} className="accent-primary" />
              {purposeLabels[purpose]}
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button disabled={pending} className="w-full">
        {pending ? "Saving…" : "Enter Nexus"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required={required} placeholder={placeholder} />
    </div>
  );
}
