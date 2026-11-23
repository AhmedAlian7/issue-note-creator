"use client";

import Link, { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import type { ComponentProps } from "react";
import { ar } from "@/lib/i18n";
import { PendingIndicator } from "./pending-indicator";

function LinkFeedback() {
  const { pending } = useLinkStatus();
  return (
    pending &&
    createPortal(
      <div className="navigation-progress link-progress" role="status">
        <PendingIndicator>{ar.pending.navigation}</PendingIndicator>
      </div>,
      document.body,
    )
  );
}

export default function PendingLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <LinkFeedback />
    </Link>
  );
}
