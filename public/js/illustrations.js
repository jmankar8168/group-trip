// Playful original SVG vector illustrations for the 10 Indian friend-group travellers
// Designed in a soft, rounded sticker aesthetic with distinct personalities, outfits, and props.

const PERSONA_SVGS = {
  // 1. Aarav - The Over-planner: Specs, neat hair, checklist clipboard, organized vibe
  "The Over-planner": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#EEF2FF" stroke="#4F46E5" stroke-width="4" stroke-dasharray="6 4"/>
      <!-- Soft aura -->
      <circle cx="80" cy="80" r="62" fill="#E0E7FF"/>
      <!-- Torso / Blue Polo -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#4F46E5"/>
      <path d="M72 110 L80 126 L88 110" stroke="#C7D2FE" stroke-width="3"/>
      <!-- Neck -->
      <rect x="73" y="94" width="14" height="18" fill="#FBBF24" rx="4"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="28" ry="30" fill="#FDE68A"/>
      <!-- Ears -->
      <circle cx="52" cy="74" r="6" fill="#FDE68A"/>
      <circle cx="108" cy="74" r="6" fill="#FDE68A"/>
      <!-- Hair: neat side-part slick -->
      <path d="M52 68 C52 44 70 40 80 40 C95 40 108 48 108 66 C104 56 94 50 80 50 C68 50 56 56 52 68 Z" fill="#1E1B4B"/>
      <!-- Glasses -->
      <rect x="58" y="66" width="18" height="14" rx="3" fill="#FFFFFF" fill-opacity="0.8" stroke="#1E1B4B" stroke-width="2.5"/>
      <rect x="84" y="66" width="18" height="14" rx="3" fill="#FFFFFF" fill-opacity="0.8" stroke="#1E1B4B" stroke-width="2.5"/>
      <line x1="76" y1="73" x2="84" y2="73" stroke="#1E1B4B" stroke-width="2.5"/>
      <!-- Eyes behind glasses -->
      <circle cx="67" cy="73" r="3" fill="#1E1B4B"/>
      <circle cx="93" cy="73" r="3" fill="#1E1B4B"/>
      <!-- Eyebrows -->
      <path d="M60 62 Q67 59 74 62" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M86 62 Q93 59 100 62" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Smile -->
      <path d="M73 88 Q80 94 87 88" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Clipboard Prop on side -->
      <g transform="translate(100, 95) rotate(-12)">
        <rect x="0" y="0" width="28" height="38" rx="4" fill="#F3F4F6" stroke="#4B5563" stroke-width="2"/>
        <rect x="8" y="-4" width="12" height="6" rx="2" fill="#D1D5DB" stroke="#374151" stroke-width="1.5"/>
        <line x1="6" y1="12" x2="22" y2="12" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
        <line x1="6" y1="18" x2="22" y2="18" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
        <line x1="6" y1="24" x2="16" y2="24" stroke="#6B7280" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `,

  // 2. Bhavna - The Budget Watcher: Sharp topknot, watchful eyes, rupee pouch / calculator
  "The Budget Watcher": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#ECFDF5" stroke="#10B981" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#D1FAE5"/>
      <!-- Green Kurti -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#059669"/>
      <path d="M74 110 L80 124 L86 110" stroke="#A7F3D0" stroke-width="2.5"/>
      <!-- Neck -->
      <rect x="73" y="94" width="14" height="18" fill="#FBBF24" rx="4"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FDE68A"/>
      <!-- Ears -->
      <circle cx="53" cy="75" r="5" fill="#FDE68A"/>
      <circle cx="107" cy="75" r="5" fill="#FDE68A"/>
      <circle cx="53" cy="80" r="2.5" fill="#10B981"/>
      <circle cx="107" cy="80" r="2.5" fill="#10B981"/>
      <!-- Hair: high bun -->
      <circle cx="80" cy="38" r="16" fill="#18181B"/>
      <path d="M53 68 C53 44 70 42 80 42 C92 42 107 46 107 68 C102 54 94 48 80 48 C66 48 58 54 53 68 Z" fill="#18181B"/>
      <!-- Eyes & Brow: watchful, skeptical -->
      <ellipse cx="68" cy="72" rx="3.5" ry="4" fill="#18181B"/>
      <ellipse cx="92" cy="72" rx="3.5" ry="4" fill="#18181B"/>
      <path d="M62 64 Q68 62 74 65" stroke="#18181B" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M86 65 Q92 62 98 64" stroke="#18181B" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Smile: quirky wry smirk -->
      <path d="M74 88 Q82 91 87 86" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Bindi -->
      <circle cx="80" cy="62" r="2" fill="#EF4444"/>
      <!-- Rupee Badge Prop -->
      <g transform="translate(25, 96)">
        <circle cx="15" cy="15" r="15" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
        <text x="15" y="21" font-family="Plus Jakarta Sans, sans-serif" font-weight="900" font-size="16" fill="#FFFFFF" text-anchor="middle">₹</text>
      </g>
    </svg>
  `,

  // 3. Chetan - The Weekend Only: Exhausted techie, hoodie, smartwatch checking time
  "The Weekend Only": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#FFFBEB" stroke="#F59E0B" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#FEF3C7"/>
      <!-- Amber Hoodie -->
      <path d="M40 145 C40 115 58 108 80 108 C102 108 120 115 120 145 Z" fill="#D97706"/>
      <!-- Hood outline -->
      <path d="M52 110 C52 90 64 90 80 90 C96 90 108 90 108 110" stroke="#B45309" stroke-width="4" fill="none"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FCD34D"/>
      <!-- Hair: slightly messy spiked -->
      <path d="M53 66 C50 48 64 40 80 38 C94 36 107 46 107 66 C103 52 90 48 80 48 C68 48 57 54 53 66 Z" fill="#292524"/>
      <path d="M72 38 L76 30 L84 38 L92 32 L94 40" fill="#292524"/>
      <!-- Eyes with tired lower eye bags -->
      <circle cx="68" cy="72" r="3.5" fill="#292524"/>
      <circle cx="92" cy="72" r="3.5" fill="#292524"/>
      <path d="M64 78 Q68 81 72 78" stroke="#F59E0B" stroke-width="2"/>
      <path d="M88 78 Q92 81 96 78" stroke="#F59E0B" stroke-width="2"/>
      <!-- Smile -->
      <path d="M74 88 Q80 92 86 88" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
      <!-- Smartwatch wristband prop -->
      <g transform="translate(105, 95)">
        <rect x="0" y="0" width="22" height="26" rx="6" fill="#18181B" stroke="#4B5563" stroke-width="2"/>
        <text x="11" y="16" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="8" fill="#10B981" text-anchor="middle">FRI</text>
      </g>
    </svg>
  `,

  // 4. Divya - The Ghost: Chill headphones, oversized hoodie, floating bubble
  "The Ghost": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#F5F3FF" stroke="#8B5CF6" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#EDE9FE"/>
      <!-- Purple Hoodie -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#7C3AED"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FDE68A"/>
      <!-- Hair: wavy shoulder length with bangs -->
      <path d="M52 68 C52 42 66 40 80 40 C94 40 108 42 108 68 C110 88 108 102 104 108 C102 88 104 60 80 60 C56 60 58 88 56 108 C52 102 50 88 52 68 Z" fill="#312E81"/>
      <!-- Headphones band -->
      <path d="M48 70 C48 44 62 34 80 34 C98 34 112 44 112 70" stroke="#A78BFA" stroke-width="5" fill="none"/>
      <rect x="44" y="65" width="10" height="20" rx="4" fill="#C4B5FD" stroke="#6D28D9" stroke-width="2"/>
      <rect x="106" y="65" width="10" height="20" rx="4" fill="#C4B5FD" stroke="#6D28D9" stroke-width="2"/>
      <!-- Eyes: gentle squint -->
      <path d="M64 73 Q68 70 72 73" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M88 73 Q92 70 96 73" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M74 88 Q80 92 86 88" stroke="#92400E" stroke-width="2" stroke-linecap="round"/>
      <!-- "Seen" checkmarks badge -->
      <g transform="translate(25, 96)">
        <circle cx="14" cy="14" r="14" fill="#8B5CF6"/>
        <text x="14" y="19" font-family="Plus Jakarta Sans, sans-serif" font-weight="900" font-size="12" fill="#FFFFFF" text-anchor="middle">✓✓</text>
      </g>
    </svg>
  `,

  // 5. Kabir - The "I'm Fine With Anything": Shrugging hands, casual tee, curly hair
  "The \"I'm Fine With Anything\"": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#FDF2F8" stroke="#EC4899" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#FCE7F3"/>
      <!-- Pink Tee -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#DB2777"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FCD34D"/>
      <!-- Hair: curly fluff -->
      <circle cx="65" cy="46" r="12" fill="#1C1917"/>
      <circle cx="80" cy="42" r="14" fill="#1C1917"/>
      <circle cx="95" cy="46" r="12" fill="#1C1917"/>
      <circle cx="56" cy="56" r="10" fill="#1C1917"/>
      <circle cx="104" cy="56" r="10" fill="#1C1917"/>
      <!-- Face details -->
      <circle cx="68" cy="73" r="3.5" fill="#1C1917"/>
      <circle cx="92" cy="73" r="3.5" fill="#1C1917"/>
      <path d="M62 64 Q68 60 74 62" stroke="#1C1917" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M86 62 Q92 60 98 64" stroke="#1C1917" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Shrug mouth -->
      <path d="M72 87 Q80 87 88 89" stroke="#78350F" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Shrug emoji icon badge -->
      <g transform="translate(105, 96)">
        <circle cx="14" cy="14" r="14" fill="#F43F5E"/>
        <text x="14" y="20" font-family="Plus Jakarta Sans, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" text-anchor="middle">¯\\_</text>
      </g>
    </svg>
  `,

  // 6. Meera - The Road Tripper: Aviator sunglasses, denim jacket, steering badge
  "The Road Tripper": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#ECFEFF" stroke="#06B6D4" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#CFFAFE"/>
      <!-- Denim jacket -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#0891B2"/>
      <path d="M74 110 L80 125 L86 110" stroke="#A5F3FC" stroke-width="2.5"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FDE68A"/>
      <!-- Hair: high ponytail with flying strands -->
      <ellipse cx="80" cy="46" rx="26" ry="18" fill="#1E293B"/>
      <path d="M96 46 C115 40 125 55 120 75 C116 65 110 55 96 50 Z" fill="#1E293B"/>
      <!-- Aviator sunglasses -->
      <path d="M57 65 C57 65 67 63 75 66 C77 75 72 83 65 83 C58 83 55 75 57 65 Z" fill="#0F172A" stroke="#E2E8F0" stroke-width="1.5"/>
      <path d="M85 66 C93 63 103 65 103 65 C105 75 102 83 95 83 C88 83 83 75 85 66 Z" fill="#0F172A" stroke="#E2E8F0" stroke-width="1.5"/>
      <line x1="75" y1="68" x2="85" y2="68" stroke="#E2E8F0" stroke-width="2"/>
      <!-- Bright bold smile -->
      <path d="M72 90 Q80 97 88 90" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Steering wheel prop badge -->
      <g transform="translate(25, 96)">
        <circle cx="14" cy="14" r="14" fill="#06B6D4" stroke="#0891B2" stroke-width="2"/>
        <circle cx="14" cy="14" r="9" stroke="#FFFFFF" stroke-width="2" fill="none"/>
        <line x1="14" y1="5" x2="14" y2="23" stroke="#FFFFFF" stroke-width="2"/>
        <line x1="5" y1="14" x2="23" y2="14" stroke="#FFFFFF" stroke-width="2"/>
      </g>
    </svg>
  `,

  // 7. Rohan - The Foodie: Chef cap tilt or foodie grin, mustard apron / polo, chai cup
  "The Foodie": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#FFF1F2" stroke="#F43F5E" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#FFE4E6"/>
      <!-- Red Polo -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#E11D48"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="28" ry="29" fill="#FCD34D"/>
      <!-- Chubby happy cheeks -->
      <circle cx="58" cy="82" r="6" fill="#F43F5E" fill-opacity="0.3"/>
      <circle cx="102" cy="82" r="6" fill="#F43F5E" fill-opacity="0.3"/>
      <!-- Hair: textured quiff -->
      <path d="M54 66 C52 46 68 40 80 40 C95 40 106 48 106 66 C102 54 92 48 80 48 C68 48 58 54 54 66 Z" fill="#1C1917"/>
      <!-- Eyes: delighted curves -->
      <path d="M64 72 Q68 68 72 72" stroke="#1C1917" stroke-width="3" stroke-linecap="round"/>
      <path d="M88 72 Q92 68 96 72" stroke="#1C1917" stroke-width="3" stroke-linecap="round"/>
      <!-- Broad happy grin -->
      <path d="M70 86 Q80 98 90 86 Z" fill="#9F1239" stroke="#78350F" stroke-width="1.5"/>
      <!-- Chai glass prop -->
      <g transform="translate(105, 96)">
        <path d="M5 6 L23 6 L19 26 L9 26 Z" fill="#D97706" stroke="#451A03" stroke-width="2"/>
        <line x1="8" y1="12" x2="20" y2="12" stroke="#FEF3C7" stroke-width="1.5"/>
        <path d="M12 2 Q14 -3 16 2" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>
  `,

  // 8. Ananya - The Mountain Lover: Beanie cap, warm scarf, mountain seeker
  "The Mountain Lover": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#F0F9FF" stroke="#0EA5E9" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#E0F2FE"/>
      <!-- Puffer jacket & warm scarf -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#0284C7"/>
      <path d="M56 108 C64 116 96 116 104 108 C104 122 56 122 56 108 Z" fill="#38BDF8"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FDE68A"/>
      <!-- Mountain Beanie Cap -->
      <path d="M52 64 C52 40 64 32 80 32 C96 32 108 40 108 64 Z" fill="#0369A1"/>
      <rect x="48" y="60" width="64" height="10" rx="4" fill="#0284C7"/>
      <circle cx="80" cy="28" r="6" fill="#BAE6FD"/>
      <!-- Hair peeking out -->
      <path d="M52 70 C48 86 52 98 56 102" stroke="#1E293B" stroke-width="4" stroke-linecap="round"/>
      <path d="M108 70 C112 86 108 98 104 102" stroke="#1E293B" stroke-width="4" stroke-linecap="round"/>
      <!-- Bright eyes -->
      <circle cx="68" cy="74" r="3.5" fill="#0F172A"/>
      <circle cx="92" cy="74" r="3.5" fill="#0F172A"/>
      <path d="M73 88 Q80 93 87 88" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Mountain peaks badge -->
      <g transform="translate(25, 96)">
        <circle cx="14" cy="14" r="14" fill="#0EA5E9"/>
        <path d="M6 20 L14 8 L22 20 Z" fill="#FFFFFF"/>
        <path d="M12 20 L17 12 L22 20 Z" fill="#BAE6FD"/>
      </g>
    </svg>
  `,

  // 9. Vikram - The Beach Bum: Floral summer shirt, shades on head, tropical grin
  "The Beach Bum": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#FEFCE8" stroke="#EAB308" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#FEF08A"/>
      <!-- Floral Hawaiian style shirt -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#CA8A04"/>
      <circle cx="60" cy="125" r="3" fill="#FEF08A"/>
      <circle cx="95" cy="132" r="3" fill="#FEF08A"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="28" ry="29" fill="#FCD34D"/>
      <!-- Beachy wavy hair -->
      <path d="M52 66 C50 42 66 38 80 38 C96 38 108 44 108 66 C104 52 94 46 80 46 C66 46 56 52 52 66 Z" fill="#451A03"/>
      <!-- Sunglasses pushed up onto head -->
      <rect x="62" y="44" width="16" height="8" rx="2" fill="#18181B" stroke="#F59E0B" stroke-width="1.5"/>
      <rect x="82" y="44" width="16" height="8" rx="2" fill="#18181B" stroke="#F59E0B" stroke-width="1.5"/>
      <line x1="78" y1="48" x2="82" y2="48" stroke="#F59E0B" stroke-width="2"/>
      <!-- Relaxed cool eyes -->
      <circle cx="68" cy="72" r="3.5" fill="#18181B"/>
      <circle cx="92" cy="72" r="3.5" fill="#18181B"/>
      <path d="M72 88 Q80 96 88 88" stroke="#78350F" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Coconut drink badge -->
      <g transform="translate(105, 96)">
        <circle cx="14" cy="14" r="14" fill="#EAB308"/>
        <circle cx="14" cy="15" r="9" fill="#78350F"/>
        <line x1="14" y1="8" x2="19" y2="3" stroke="#EC4899" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </svg>
  `,

  // 10. Pooja - The Sensitive Traveler: Soft lavender scarf, careful smile, sanitizer / tea
  "The Sensitive Traveler": `
    <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="72" fill="#F0FDFA" stroke="#14B8A6" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="80" cy="80" r="62" fill="#CCFBF1"/>
      <!-- Teal comfort sweater -->
      <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="#0D9488"/>
      <path d="M60 110 C70 120 90 120 100 110 C95 125 65 125 60 110 Z" fill="#5EEAD4"/>
      <!-- Head -->
      <ellipse cx="80" cy="74" rx="27" ry="29" fill="#FDE68A"/>
      <!-- Soft parted layered hair -->
      <path d="M53 68 C53 42 66 38 80 38 C94 38 107 42 107 68 C105 84 102 96 98 102 C96 82 96 52 80 52 C64 52 64 82 62 102 C58 96 55 84 53 68 Z" fill="#262626"/>
      <!-- Delicate earrings -->
      <circle cx="53" cy="76" r="3" fill="#14B8A6"/>
      <circle cx="107" cy="76" r="3" fill="#14B8A6"/>
      <!-- Gentle watchful eyes -->
      <ellipse cx="68" cy="72" rx="3.5" ry="4" fill="#262626"/>
      <ellipse cx="92" cy="72" rx="3.5" ry="4" fill="#262626"/>
      <path d="M62 65 Q68 62 74 64" stroke="#262626" stroke-width="2" stroke-linecap="round"/>
      <path d="M86 64 Q92 62 98 65" stroke="#262626" stroke-width="2" stroke-linecap="round"/>
      <!-- Gentle polite smile -->
      <path d="M74 88 Q80 92 86 88" stroke="#92400E" stroke-width="2" stroke-linecap="round"/>
      <!-- Pure leaf / shield hygiene badge -->
      <g transform="translate(25, 96)">
        <circle cx="14" cy="14" r="14" fill="#14B8A6"/>
        <path d="M14 6 C8 12 8 20 14 22 C20 20 20 12 14 6 Z" fill="#FFFFFF"/>
      </g>
    </svg>
  `
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PERSONA_SVGS };
}
