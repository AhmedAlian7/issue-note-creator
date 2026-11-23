import Image from "next/image";
import wordmark from "./wordmark.png";

export function Wordmark() {
  return (
    <Image
      className="brand-wordmark"
      src={wordmark}
      alt="Italin"
      width={160}
      height={61}
      loading="eager"
      unoptimized
    />
  );
}
