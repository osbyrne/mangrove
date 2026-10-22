export function BotanicalMark(props: { class?: string }) {
  return <svg class={props.class} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 34V18M20 26C9 27 6 18 7 10c10-1 15 5 13 16ZM20 20C19 9 25 5 34 6c1 9-5 15-14 14Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
}

export function Artwork(props: { small?: boolean; class?: string }) {
  return <div class={`artwork ${props.small ? 'artwork-small' : ''} ${props.class ?? ''}`} role="img" aria-label="Abstract mangrove branches and a cream sun on a deep green record sleeve">
    <svg viewBox="0 0 600 600" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={props.small ? 'sleeve-small' : 'sleeve'} x1="0" y1="0" x2="600" y2="600" gradientUnits="userSpaceOnUse">
          <stop stop-color="#345c49" /><stop offset="1" stop-color="#142f2a" />
        </linearGradient>
        <pattern id={props.small ? 'lines-small' : 'lines'} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V6" stroke="#e3e0ba" stroke-opacity=".035" /></pattern>
      </defs>
      <path fill={`url(#${props.small ? 'sleeve-small' : 'sleeve'})`} d="M0 0h600v600H0z" />
      <circle cx="305" cy="282" r="177" fill="#dbd9b9" />
      <circle cx="305" cy="282" r="158" stroke="#314d3c" stroke-opacity=".11" />
      <circle cx="305" cy="282" r="142" stroke="#314d3c" stroke-opacity=".09" />
      <circle cx="305" cy="282" r="126" stroke="#314d3c" stroke-opacity=".07" />
      <circle cx="305" cy="282" r="47" fill="#c8c7a7" />
      <circle cx="305" cy="282" r="4" fill="#2b4d3d" />
      <g stroke="#8fa282" stroke-width="2" stroke-linecap="round">
        <path d="M275 627c6-91 39-119 36-188-3-77-57-98-62-156-5-54 16-86 4-145M311 440c24-64 75-82 95-128 21-48 14-83 40-121M291 536c-40-74-97-85-119-138-18-43-4-79-31-117M266 359c-56-5-79-43-111-65M319 411c-2-67 30-88 28-125" />
        <path d="M253 171c-50 0-76-33-65-70 40 5 69 28 65 70ZM254 213c40-16 54-49 35-80-34 11-48 42-35 80ZM256 282c-51-4-74-35-67-68 39 4 64 29 67 68ZM276 337c35-19 44-50 29-77-32 11-45 44-29 77ZM174 392c-51-3-73-36-66-71 40 5 66 34 66 71ZM208 453c30-26 32-59 7-84-30 18-32 53-7 84ZM152 292c-37 6-61-13-63-43 29-5 55 12 63 43ZM354 386c50 11 84-12 86-47-42-9-73 12-86 47ZM393 335c-25-31-21-64 6-82 26 24 24 56-6 82ZM417 279c41 7 67-14 67-43-33-4-59 14-67 43ZM437 215c-9-40 9-67 40-73 11 34-8 63-40 73ZM347 305c-29-20-34-49-15-73 28 13 36 44 15 73Z" fill="#71876a" stroke="none" />
        <path d="M253 171 210 122M254 213l30-61M256 282l-52-53M276 337l24-61M174 392l-52-56M208 453l7-66M152 292l-48-30M354 386l70-35M393 335l6-64M417 279l52-34M437 215l34-57M347 305l-13-57" stroke="#233f31" stroke-width="1.5" stroke-opacity=".7" />
      </g>
      <path d="M0 551c90-30 152-15 230-17 93-3 195-38 370-6v72H0Z" fill="#1b362c" fill-opacity=".7" />
      <path fill={`url(#${props.small ? 'lines-small' : 'lines'})`} d="M0 0h600v600H0z" />
      <g fill="#e2e2c9" font-family="Georgia, serif" text-anchor="middle">
        <text x="300" y="63" font-size="20" letter-spacing="1">Mangrove</text>
        <text x="300" y="565" font-size="12" letter-spacing="2">A place to take root.</text>
      </g>
    </svg>
  </div>
}
