"use client";

import { Button } from "@ui-sdk/react/button";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  toast,
} from "@ui-sdk/react/toast";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied", { description: text.length > 60 ? undefined : text });
  } catch {
    toast("Couldn't copy", { description: "Select the text and copy it by hand." });
  }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <Button className="btn btn-quiet" onClick={() => copy(text)}>
      {label}
    </Button>
  );
}

export function CopyInstall() {
  const cmd = "npm i distortion-wave";
  return (
    <div className="install-chip">
      <code>{cmd}</code>
      <Button className="btn btn-quiet" onClick={() => copy(cmd)}>
        Copy
      </Button>
    </div>
  );
}

export function Toasts() {
  return (
    <ToastRegion className="toasts">
      {() => (
        <Toast className="toast">
          <ToastTitle />
          <ToastDescription />
          <ToastClose aria-label="Dismiss" />
        </Toast>
      )}
    </ToastRegion>
  );
}
