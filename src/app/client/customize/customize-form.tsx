"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomizationAction } from "./actions";

export type CustomizeFormProps = {
  maxPrompts: number;
  signageApplicable: boolean;
  defaultValues: {
    displayName1: string;
    displayName2: string;
    welcomeMessage: string;
    signageText: string;
    clientNotes: string;
    prompts: string[];
  };
};

export function CustomizeForm({ maxPrompts, signageApplicable, defaultValues }: CustomizeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [displayName1, setDisplayName1] = useState(defaultValues.displayName1);
  const [displayName2, setDisplayName2] = useState(defaultValues.displayName2);
  const [welcomeMessage, setWelcomeMessage] = useState(defaultValues.welcomeMessage);
  const [signageText, setSignageText] = useState(defaultValues.signageText);
  const [clientNotes, setClientNotes] = useState(defaultValues.clientNotes);
  const [prompts, setPrompts] = useState<string[]>(
    defaultValues.prompts.length > 0 ? defaultValues.prompts : [""],
  );

  function updatePrompt(index: number, value: string) {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function addPrompt() {
    setPrompts((prev) => (prev.length >= maxPrompts ? prev : [...prev, ""]));
  }

  function removePrompt(index: number) {
    setPrompts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function save(submit: boolean) {
    setError(null);
    setSavedMessage(null);

    startTransition(async () => {
      const result = await saveCustomizationAction({
        displayName1,
        displayName2,
        welcomeMessage,
        signageText,
        clientNotes,
        prompts,
        submit,
      });
      if (result.ok) {
        setSavedMessage(submit ? "Submitted! We'll use these details to prepare your booth." : "Draft saved.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(true);
      }}
      noValidate
      className="mt-6 space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="displayName1">Display name 1</Label>
          <Input id="displayName1" className="mt-1.5" value={displayName1} onChange={(e) => setDisplayName1(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="displayName2">Display name 2</Label>
          <Input id="displayName2" className="mt-1.5" value={displayName2} onChange={(e) => setDisplayName2(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="welcomeMessage">Welcome-screen message</Label>
        <Textarea
          id="welcomeMessage"
          className="mt-1.5"
          rows={3}
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
        />
      </div>

      {signageApplicable ? (
        <div>
          <Label htmlFor="signageText">Signage wording</Label>
          <Textarea id="signageText" className="mt-1.5" rows={2} value={signageText} onChange={(e) => setSignageText(e.target.value)} />
        </div>
      ) : null}

      <div>
        <div className="flex items-baseline justify-between">
          <Label>Recording prompts</Label>
          <span className="text-xs text-muted-foreground">
            {prompts.length} / {maxPrompts}
          </span>
        </div>
        <div className="mt-1.5 space-y-2">
          {prompts.map((prompt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Prompt ${index + 1}`}
                value={prompt}
                onChange={(e) => updatePrompt(index, e.target.value)}
                placeholder={`Prompt ${index + 1}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={prompts.length <= 1}
                onClick={() => removePrompt(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" disabled={prompts.length >= maxPrompts} onClick={addPrompt}>
          Add prompt
        </Button>
      </div>

      <div>
        <Label htmlFor="clientNotes">Notes to Memory Studio</Label>
        <Textarea id="clientNotes" className="mt-1.5" rows={3} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedMessage ? <p className="text-sm text-muted-foreground">{savedMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Submit"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => save(false)}>
          Save draft
        </Button>
      </div>
    </form>
  );
}
