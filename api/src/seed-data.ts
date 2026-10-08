/** Development data only. The demo account is created by `scripts.js seed` on an empty database. */
export const DEMO_USER = { email: 'demo@example.com', name: 'Demo User', password: 'demo-password-123' };

type Seed = { name: string; category: string; priceCents: number; tags: string[]; description: string; inStock?: boolean };

const raw: Seed[] = [
  { name: 'Walnut desk shelf', category: 'Desk', priceCents: 8900, tags: ['wood', 'storage'], description: 'Solid walnut riser that lifts the monitor and hides the clutter underneath.' },
  { name: 'Felt desk mat', category: 'Desk', priceCents: 3200, tags: ['felt', 'mat'], description: 'Merino wool felt, 90 x 40 cm, quiet under the keyboard.' },
  { name: 'Cable tray', category: 'Desk', priceCents: 2400, tags: ['cables', 'storage'], description: 'Under-desk steel tray that keeps power bricks off the floor.' },
  { name: 'Monitor arm', category: 'Desk', priceCents: 12900, tags: ['ergonomics', 'vesa'], description: 'Gas-spring arm for 17-34 inch screens up to 9 kg.' },
  { name: 'Laptop stand', category: 'Desk', priceCents: 4900, tags: ['aluminium', 'ergonomics'], description: 'Folding aluminium stand with six height positions.' },
  { name: 'Standing desk frame', category: 'Desk', priceCents: 39900, tags: ['ergonomics', 'motorised'], description: 'Dual-motor frame, 62-127 cm, four memory presets.', inStock: false },
  { name: 'Mechanical keyboard 75%', category: 'Keyboards', priceCents: 13900, tags: ['mechanical', 'hot-swap'], description: 'Gasket-mount aluminium case with tactile switches.' },
  { name: 'Low-profile keyboard', category: 'Keyboards', priceCents: 9900, tags: ['wireless', 'slim'], description: 'Bluetooth and USB-C, three devices, two weeks per charge.' },
  { name: 'Split ergonomic keyboard', category: 'Keyboards', priceCents: 22900, tags: ['ergonomics', 'split'], description: 'Tented split layout that keeps the wrists straight.' },
  { name: 'Wrist rest', category: 'Keyboards', priceCents: 2900, tags: ['wood', 'ergonomics'], description: 'Oiled beech wrist rest for tenkeyless boards.' },
  { name: 'Keycap set PBT', category: 'Keyboards', priceCents: 5900, tags: ['pbt', 'keycaps'], description: 'Dye-sublimated PBT caps in a cherry profile.' },
  { name: 'Wireless mouse', category: 'Mice', priceCents: 7900, tags: ['wireless', 'ergonomics'], description: 'Sculpted right-hand mouse with a free-spinning wheel.' },
  { name: 'Vertical mouse', category: 'Mice', priceCents: 5900, tags: ['ergonomics', 'vertical'], description: '57 degree grip that reduces forearm twist.' },
  { name: 'Trackpad', category: 'Mice', priceCents: 11900, tags: ['gestures', 'wireless'], description: 'Glass multi-touch surface with haptic clicks.' },
  { name: '27" 4K monitor', category: 'Monitors', priceCents: 42900, tags: ['4k', 'usb-c'], description: 'IPS panel, 65 W USB-C power delivery, factory calibrated.' },
  { name: '34" ultrawide monitor', category: 'Monitors', priceCents: 59900, tags: ['ultrawide', '144hz'], description: '3440 x 1440 curved panel at 144 Hz.' },
  { name: 'Portable monitor', category: 'Monitors', priceCents: 19900, tags: ['portable', 'usb-c'], description: '15.6 inch 1080p screen powered over one cable.' },
  { name: 'Monitor light bar', category: 'Lighting', priceCents: 6900, tags: ['led', 'glare-free'], description: 'Asymmetric light on the desk, none on the screen.' },
  { name: 'Desk lamp', category: 'Lighting', priceCents: 8900, tags: ['led', 'dimmable'], description: 'Warm-to-cool LED with a weighted base.' },
  { name: 'Key light', category: 'Lighting', priceCents: 14900, tags: ['video', 'led'], description: 'Soft panel light for calls, app controlled.' },
  { name: 'Smart bulb pack', category: 'Lighting', priceCents: 3900, tags: ['smart', 'rgb'], description: 'Two E27 bulbs, 16 million colours, schedules.' },
  { name: 'USB microphone', category: 'Audio', priceCents: 12900, tags: ['usb', 'podcast'], description: 'Cardioid condenser with a headphone monitor jack.' },
  { name: 'Closed-back headphones', category: 'Audio', priceCents: 15900, tags: ['wired', 'studio'], description: 'Neutral studio headphones with detachable cable.' },
  { name: 'Noise-cancelling headset', category: 'Audio', priceCents: 24900, tags: ['anc', 'wireless'], description: 'Hybrid ANC and a boom mic for open offices.' },
  { name: 'Desktop speakers', category: 'Audio', priceCents: 17900, tags: ['bluetooth', 'speakers'], description: 'Powered bookshelf pair with optical input.' },
  { name: 'Webcam 4K', category: 'Video', priceCents: 16900, tags: ['4k', 'usb'], description: 'Auto-framing webcam with a privacy shutter.' },
  { name: 'Capture card', category: 'Video', priceCents: 13900, tags: ['hdmi', 'streaming'], description: 'Records 4K60 HDMI sources over USB.' },
  { name: 'USB-C dock', category: 'Cables & Power', priceCents: 18900, tags: ['usb-c', 'thunderbolt'], description: 'Two displays, ethernet and 96 W charging over one cable.' },
  { name: 'GaN charger 100 W', category: 'Cables & Power', priceCents: 5900, tags: ['gan', 'usb-c'], description: 'Three ports in a charger the size of a phone charger.' },
  { name: 'Braided USB-C cable', category: 'Cables & Power', priceCents: 1900, tags: ['usb-c', '240w'], description: '2 m cable rated for 240 W and 40 Gbit/s.' },
  { name: 'Power strip with USB', category: 'Cables & Power', priceCents: 3400, tags: ['surge', 'usb'], description: 'Six outlets, surge protection, two USB-C ports.' },
  { name: 'Velcro cable ties', category: 'Cables & Power', priceCents: 900, tags: ['cables'], description: 'Fifty reusable ties in three lengths.' },
  { name: 'Ergonomic chair', category: 'Seating', priceCents: 64900, tags: ['ergonomics', 'mesh'], description: 'Adjustable lumbar support, 4D armrests, mesh back.' },
  { name: 'Footrest', category: 'Seating', priceCents: 4500, tags: ['ergonomics'], description: 'Tilting footrest with a massage surface.' },
  { name: 'Seat cushion', category: 'Seating', priceCents: 3900, tags: ['memory-foam'], description: 'Memory foam cushion with a coccyx cut-out.', inStock: false },
  { name: 'Desk plant pot', category: 'Decor', priceCents: 2200, tags: ['ceramic', 'plants'], description: 'Self-watering ceramic pot for small plants.' },
];

export const DEMO_ITEMS = raw.map((item) => ({ ...item, inStock: item.inStock ?? true }));
