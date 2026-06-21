export function PlinthLogo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="plinthgrad" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#ff7a59" />
          <stop offset="1" stopColor="#ff5722" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#plinthgrad)" />
      <path
        d="M16 12h7v24h-7zM23 12h11v14h-11zM28.5 15.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill="white"
        fillRule="evenodd"
      />
    </svg>
  );
}
