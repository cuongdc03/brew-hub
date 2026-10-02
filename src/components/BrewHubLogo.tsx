import React from "react";

interface BrewHubLogoProps {
  className?: string;
  size?: number;
}

/**
 * Handcrafted vector artisan mark for Brew Hub.
 * Features an elegant, precision-drawn copper/brass vessel with natural grain motif.
 * Designed with Human Interface restraint: no neon candy gradients or AI emojis.
 */
export const BrewHubLogo: React.FC<BrewHubLogoProps> = ({
  className = "w-8 h-8",
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Subtle, tactile warm metal finish */}
        <linearGradient id="brewMetal" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2A84B" />
          <stop offset="50%" stopColor="#C48828" />
          <stop offset="100%" stopColor="#966115" />
        </linearGradient>

        <linearGradient id="bodyPlate" x1="12" y1="14" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A241E" />
          <stop offset="100%" stopColor="#1C1814" />
        </linearGradient>

        {/* Specular inner bevel */}
        <filter id="subtleBevel" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Squircle Base Tile with warm tactile depth */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="10"
        fill="url(#bodyPlate)"
        stroke="url(#brewMetal)"
        strokeWidth="1.25"
        strokeOpacity="0.45"
        filter="url(#subtleBevel)"
      />

      {/* Artisan Copper Trim Accent */}
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="8.5"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.75"
      />

      {/* Precision Vessel Contour */}
      <path
        d="M17 15H31C32.1 15 33 15.9 33 17V30C33 34.4 29.4 38 25 38H23C18.6 38 15 34.4 15 30V17C15 15.9 15.9 15 17 15Z"
        fill="#1C1916"
        stroke="url(#brewMetal)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Crafted Handle */}
      <path
        d="M33 19H35.5C37.4 19 39 20.6 39 22.5V25.5C39 27.4 37.4 29 35.5 29H33"
        stroke="url(#brewMetal)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fine Engraved Ribs (Craftsmanship detail) */}
      <line
        x1="18.5"
        y1="23"
        x2="29.5"
        y2="23"
        stroke="url(#brewMetal)"
        strokeWidth="1"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />
      <line
        x1="18.5"
        y1="27"
        x2="29.5"
        y2="27"
        stroke="url(#brewMetal)"
        strokeWidth="1"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />

      {/* Barley / Grain Accent at Center Top */}
      <path
        d="M24 10C24 10 21.5 12 21.5 14C21.5 15.4 22.6 16.5 24 16.5C25.4 16.5 26.5 15.4 26.5 14C26.5 12 24 10 24 10Z"
        fill="url(#brewMetal)"
      />
    </svg>
  );
};
