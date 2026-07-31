import Image from "next/image";

import { initials } from "@/lib/format";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: 34, md: 44, lg: 88 };

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const pixels = sizes[size];

  return (
    <span
      className={`avatar avatar-${size}`}
      aria-label={name}
      title={name}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={pixels}
          height={pixels}
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
