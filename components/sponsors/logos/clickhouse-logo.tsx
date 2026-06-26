import { cn } from "@/lib/utils"

type LogoProps = {
  className?: string
}

export const ClickHouseLogo = ({ className }: LogoProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="#F7A501"
      role="img"
      aria-hidden
      className={cn("h-4 w-auto", className)}
    >
      <title>ClickHouse</title>
      <path d="M21.333 10H24v4h-2.667ZM16 1.335h2.667v21.33H16Zm-5.333 0h2.666v21.33h-2.666ZM0 22.665V1.335h2.667v21.33zm5.333-21.33H8v21.33H5.333Z" />
    </svg>
  )
}
