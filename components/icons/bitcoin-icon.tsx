import type React from "react"

const BitcoinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.767 19.089c4.905-1.518 8.251-5.216 8.251-9.711 0-6.075-4.925-11-11-11S0 3.293 0 9.368c0 4.495 3.346 8.193 8.251 9.711" />
    <path d="M11.767 19.089c-4.905-1.518-8.251-5.216-8.251-9.711 0-6.075 4.925-11 11-11S23.534 3.293 23.534 9.368c0 4.495-3.346 8.193-8.251 9.711" />
    <path d="M12 12v6" />
    <path d="M12 6v6" />
    <path d="M12 12h-2" />
    <path d="M12 12h2" />
    <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
)

export default BitcoinIcon
