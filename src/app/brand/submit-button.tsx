"use client";

import { useFormStatus } from "react-dom";
import { PendingIndicator } from "./pending-indicator";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <button className={className} type="submit" disabled={pending}>
        {children}
      </button>
      {pending && (
        <span role="status">
          <PendingIndicator />
        </span>
      )}
    </>
  );
}
