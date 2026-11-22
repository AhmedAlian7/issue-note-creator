"use client";
import { useState } from "react";
import { VoiceRecorder } from "./recorder";
import { FirstHelp } from "./help";
import { Review } from "./review";
import { fromSpeech, type Item, type Draft } from "./review-model";
export function VoiceFlow({
  products,
  customers,
  userId,
  children,
  header,
  canConfirm = true,
}: {
  products: Item[];
  customers: Item[];
  userId: string;
  header?: React.ReactNode;
  canConfirm?: boolean;
  children?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  return (
    <>
      <FirstHelp userId={userId} />
      {draft ? (
        <Review
          canConfirm={canConfirm}
          initial={draft}
          products={products}
          customers={customers}
        />
      ) : (
        <>
          {header}
          <VoiceRecorder
            onResult={(r) => {
              setDraft(fromSpeech(r));
              window.scrollTo(0, 0);
            }}
          />
          {children}
        </>
      )}
    </>
  );
}
