"use client";

import { useActionState, useState } from "react";
import { createPostAction } from "@/actions/social";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export function Composer() {
  const [state, action, pending] = useActionState(createPostAction, null);
  const [type, setType] = useState("text");

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="type" value={type} />
      <Textarea name="body" placeholder="Share an update, question, or idea…" className="min-h-28" />
      <div className="mt-3 flex flex-wrap gap-2">
        {["text", "professional_update", "question", "poll", "project"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`rounded-full border px-3 py-1 text-xs ${type === value ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {value.replace("_", " ")}
          </button>
        ))}
      </div>
      {type === "poll" ? (
        <div className="mt-3 grid gap-2">
          <Input name="pollOptions" placeholder="Option A" />
          <Input name="pollOptions" placeholder="Option B" />
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Input name="linkUrl" placeholder="https://optional-link" />
        <Input name="topicTags" placeholder="topics, comma-separated" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input name="media" type="file" accept="image/*,video/mp4,video/webm,application/pdf" multiple className="max-w-56" />
          <select name="audience" className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="connections">Connections</option>
            <option value="private">Only me</option>
          </select>
        </div>
        <Button disabled={pending}>{pending ? "Publishing…" : "Publish"}</Button>
      </div>
      {state && "error" in state && state.error ? (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
