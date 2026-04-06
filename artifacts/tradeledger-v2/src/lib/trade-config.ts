export type TradeType =
  | "electrician"
  | "plumber"
  | "carpenter"
  | "builder"
  | "painter"
  | "hvac"
  | "tiler"
  | "landscaper"
  | "concreter"
  | "other";

export interface ExpenseCategory {
  key: string;
  label: string;
  examples: string;
}

export interface QuoteTemplateItem {
  desc: string;
  qty: number;
  unit_cost: number;
  markup: number;
}

export interface QuoteTemplate {
  name: string;
  items: QuoteTemplateItem[];
}

export const TRADE_EXPENSE_CATEGORIES: Record<TradeType, ExpenseCategory[]> = {
  electrician: [
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "multimeters, cable testers, drills" },
    { key: "electrical_materials", label: "⚡ Electrical Materials", examples: "cable, conduit, switchgear, fittings" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "rego, servicing, insurance" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "boots, gloves, hi-vis, hard hat" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "electrical licence, REC renewal" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  plumber: [
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "pipe cutters, pressure testers" },
    { key: "plumbing_materials", label: "🔧 Plumbing Materials", examples: "pipe, fittings, valves, hot water units" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "plumbing licence, gas licence" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  carpenter: [
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "saws, routers, nail guns, blades" },
    { key: "timber_materials", label: "🪚 Timber & Materials", examples: "framing timber, sheet materials, fixings" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "equipment_hire", label: "🏗️ Equipment Hire", examples: "scaffolding, formwork, scissor lift" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "builder licence, white card" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  builder: [
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "concreters, tilers, plumbers, sparkies" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "" },
    { key: "building_materials", label: "🏗️ Building Materials", examples: "concrete, steel, timber, bricks" },
    { key: "equipment_hire", label: "🏗️ Equipment Hire", examples: "excavator, concrete pump, scaffolding" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "" },
    { key: "licences_subscriptions", label: "📋 Licences & Permits", examples: "builder licence, council permits, DA fees" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  painter: [
    { key: "paint_materials", label: "🖌️ Paint & Materials", examples: "paint, primer, filler, sugar soap" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "brushes, rollers, spray gear, drop sheets" },
    { key: "equipment_hire", label: "🏗️ Equipment Hire", examples: "scaffolding, EWP" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "overalls, masks, eye protection" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  hvac: [
    { key: "hvac_materials", label: "❄️ HVAC Materials", examples: "refrigerant gas, copper pipe, fittings" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "manifold gauges, vacuum pump, leak detector" },
    { key: "electrical_materials", label: "⚡ Electrical Materials", examples: "cables, isolators, thermostat" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "ARCtick licence, electrical licence" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  tiler: [
    { key: "tile_materials", label: "🟫 Tiles & Materials", examples: "tiles, adhesive, grout, waterproofing membrane" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "tile saw, grinders, notched trowel, spacers" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "knee pads, gloves, safety glasses" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  landscaper: [
    { key: "landscaping_materials", label: "🌿 Plants & Materials", examples: "turf, plants, soil, mulch, irrigation fittings" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "mowers, trimmers, blowers, chainsaws" },
    { key: "equipment_hire", label: "🏗️ Equipment Hire", examples: "bobcat, excavator, tipper hire" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "ute, trailer, tip runs" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "boots, gloves, sun protection" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "pesticide licence, council permits" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  concreter: [
    { key: "concrete_materials", label: "🧱 Concrete & Materials", examples: "ready-mix concrete, reo bar, mesh, formwork" },
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "vibrator, float, screed, cutting blades" },
    { key: "equipment_hire", label: "🏗️ Equipment Hire", examples: "concrete pump, bobcat, saw cutting" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "boots, gloves, knee pads, eye protection" },
    { key: "licences_subscriptions", label: "📋 Licences & Renewals", examples: "" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
  other: [
    { key: "tools_equipment", label: "🔧 Tools & Equipment", examples: "" },
    { key: "vehicle_fuel", label: "⛽ Vehicle — Fuel", examples: "" },
    { key: "vehicle_other", label: "🚗 Vehicle — Other", examples: "" },
    { key: "protective_clothing", label: "👷 Protective Clothing", examples: "" },
    { key: "phone_internet", label: "📱 Phone & Internet", examples: "" },
    { key: "licences_subscriptions", label: "📋 Licences & Subscriptions", examples: "" },
    { key: "subcontractor_payment", label: "👤 Subcontractor", examples: "" },
    { key: "other_business", label: "📦 Other Business", examples: "" },
  ],
};

export const TRADE_QUOTE_TEMPLATES: Record<TradeType, QuoteTemplate[]> = {
  electrician: [
    { name: "Power point installation", items: [{ desc: "Labour — power point installation", qty: 1, unit_cost: 120, markup: 0 }, { desc: "GPO & materials", qty: 1, unit_cost: 45, markup: 25 }] },
    { name: "Switchboard upgrade", items: [{ desc: "Labour — switchboard upgrade", qty: 4, unit_cost: 110, markup: 0 }, { desc: "Switchboard & components", qty: 1, unit_cost: 680, markup: 20 }] },
    { name: "Light fitting supply & install", items: [{ desc: "Labour — light installation", qty: 1, unit_cost: 95, markup: 0 }, { desc: "Light fitting", qty: 1, unit_cost: 85, markup: 30 }] },
    { name: "Safety switch installation", items: [{ desc: "Labour — safety switch install", qty: 1, unit_cost: 150, markup: 0 }, { desc: "Safety switch (RCD)", qty: 1, unit_cost: 95, markup: 25 }] },
    { name: "Fault finding & repair", items: [{ desc: "Fault finding — first hour", qty: 1, unit_cost: 160, markup: 0 }, { desc: "Fault finding — additional hours", qty: 1, unit_cost: 110, markup: 0 }] },
  ],
  plumber: [
    { name: "Hot water system supply & install", items: [{ desc: "Labour — hot water installation", qty: 3, unit_cost: 120, markup: 0 }, { desc: "Hot water system (265L electric)", qty: 1, unit_cost: 850, markup: 20 }, { desc: "Fittings & materials", qty: 1, unit_cost: 95, markup: 25 }] },
    { name: "Tap replacement", items: [{ desc: "Labour — tap replacement", qty: 1, unit_cost: 180, markup: 0 }, { desc: "Tap & materials", qty: 1, unit_cost: 120, markup: 25 }] },
    { name: "Blocked drain clearance", items: [{ desc: "Labour — drain clearing", qty: 1, unit_cost: 220, markup: 0 }] },
    { name: "Toilet replacement", items: [{ desc: "Labour — toilet replacement", qty: 2, unit_cost: 120, markup: 0 }, { desc: "Toilet suite", qty: 1, unit_cost: 380, markup: 20 }] },
    { name: "Leak investigation & repair", items: [{ desc: "Leak investigation — first hour", qty: 1, unit_cost: 175, markup: 0 }, { desc: "Parts & materials", qty: 1, unit_cost: 60, markup: 25 }] },
  ],
  carpenter: [
    { name: "Decking supply & install", items: [{ desc: "Labour — decking installation", qty: 8, unit_cost: 95, markup: 0 }, { desc: "Decking timber (per lm)", qty: 20, unit_cost: 28, markup: 20 }, { desc: "Fixings & hardware", qty: 1, unit_cost: 120, markup: 20 }] },
    { name: "Door installation", items: [{ desc: "Labour — door installation", qty: 2, unit_cost: 95, markup: 0 }, { desc: "Door & frame", qty: 1, unit_cost: 350, markup: 20 }, { desc: "Hardware & fixings", qty: 1, unit_cost: 80, markup: 20 }] },
    { name: "Framing — residential", items: [{ desc: "Labour — wall framing (per sqm)", qty: 1, unit_cost: 45, markup: 0 }, { desc: "Framing timber", qty: 1, unit_cost: 320, markup: 15 }] },
    { name: "Pergola supply & install", items: [{ desc: "Labour — pergola construction", qty: 12, unit_cost: 95, markup: 0 }, { desc: "Timber & materials", qty: 1, unit_cost: 1200, markup: 15 }, { desc: "Fixings & hardware", qty: 1, unit_cost: 180, markup: 20 }] },
    { name: "Kitchen fitout — labour only", items: [{ desc: "Labour — kitchen installation", qty: 16, unit_cost: 95, markup: 0 }] },
  ],
  builder: [
    { name: "Bathroom renovation", items: [{ desc: "Demolition & disposal", qty: 1, unit_cost: 800, markup: 0 }, { desc: "Waterproofing (subcontracted)", qty: 1, unit_cost: 600, markup: 10 }, { desc: "Tiling (subcontracted)", qty: 1, unit_cost: 1800, markup: 10 }, { desc: "Plumbing (subcontracted)", qty: 1, unit_cost: 1200, markup: 10 }, { desc: "Project management & supervision", qty: 1, unit_cost: 800, markup: 0 }] },
    { name: "Alfresco / outdoor area", items: [{ desc: "Concreting (subcontracted)", qty: 1, unit_cost: 2200, markup: 10 }, { desc: "Carpentry & structure", qty: 1, unit_cost: 3500, markup: 0 }, { desc: "Project management", qty: 1, unit_cost: 500, markup: 0 }] },
    { name: "Kitchen renovation", items: [{ desc: "Demolition", qty: 1, unit_cost: 600, markup: 0 }, { desc: "Carpentry & fitout", qty: 1, unit_cost: 2800, markup: 0 }, { desc: "Plumbing (subcontracted)", qty: 1, unit_cost: 900, markup: 10 }, { desc: "Electrical (subcontracted)", qty: 1, unit_cost: 700, markup: 10 }] },
  ],
  painter: [
    { name: "Interior walls — full house", items: [{ desc: "Prep, sand & fill", qty: 1, unit_cost: 400, markup: 0 }, { desc: "Prime coat", qty: 1, unit_cost: 300, markup: 0 }, { desc: "Two coats — walls", qty: 1, unit_cost: 1200, markup: 0 }, { desc: "Paint & materials", qty: 1, unit_cost: 480, markup: 20 }] },
    { name: "Exterior repaint", items: [{ desc: "Pressure wash & prep", qty: 1, unit_cost: 350, markup: 0 }, { desc: "Prime & undercoat", qty: 1, unit_cost: 400, markup: 0 }, { desc: "Two finish coats", qty: 1, unit_cost: 1400, markup: 0 }, { desc: "Paint & materials", qty: 1, unit_cost: 520, markup: 20 }] },
    { name: "Single room repaint", items: [{ desc: "Labour — single room", qty: 1, unit_cost: 350, markup: 0 }, { desc: "Paint & materials", qty: 1, unit_cost: 90, markup: 20 }] },
    { name: "Ceilings only", items: [{ desc: "Labour — ceiling repaint", qty: 1, unit_cost: 280, markup: 0 }, { desc: "Ceiling paint", qty: 1, unit_cost: 65, markup: 20 }] },
  ],
  hvac: [
    { name: "Split system supply & install", items: [{ desc: "Labour — split system installation", qty: 4, unit_cost: 110, markup: 0 }, { desc: "Split system unit (2.5kW)", qty: 1, unit_cost: 680, markup: 20 }, { desc: "Copper pipe & materials", qty: 1, unit_cost: 180, markup: 20 }] },
    { name: "Service & maintenance", items: [{ desc: "Service call — clean & inspect", qty: 1, unit_cost: 185, markup: 0 }, { desc: "Parts if required", qty: 1, unit_cost: 0, markup: 25 }] },
    { name: "Gas recharge", items: [{ desc: "Labour — gas charge", qty: 1, unit_cost: 180, markup: 0 }, { desc: "Refrigerant gas (per kg)", qty: 1, unit_cost: 85, markup: 30 }] },
    { name: "Ducted system install", items: [{ desc: "Labour — ducted installation", qty: 16, unit_cost: 110, markup: 0 }, { desc: "Ducted system & components", qty: 1, unit_cost: 3200, markup: 15 }] },
  ],
  tiler: [
    { name: "Floor tiling", items: [{ desc: "Labour — floor tiling (per sqm)", qty: 20, unit_cost: 65, markup: 0 }, { desc: "Adhesive & grout", qty: 1, unit_cost: 180, markup: 20 }] },
    { name: "Bathroom wall tiling", items: [{ desc: "Labour — wall tiling (per sqm)", qty: 15, unit_cost: 75, markup: 0 }, { desc: "Adhesive, grout & materials", qty: 1, unit_cost: 160, markup: 20 }] },
    { name: "Waterproofing", items: [{ desc: "Labour — waterproofing application", qty: 1, unit_cost: 350, markup: 0 }, { desc: "Waterproofing membrane & tape", qty: 1, unit_cost: 120, markup: 20 }] },
    { name: "Tile removal", items: [{ desc: "Labour — tile removal (per sqm)", qty: 15, unit_cost: 35, markup: 0 }, { desc: "Disposal", qty: 1, unit_cost: 120, markup: 0 }] },
  ],
  landscaper: [
    { name: "Lawn mowing — regular", items: [{ desc: "Lawn mow, edge & blow", qty: 1, unit_cost: 85, markup: 0 }] },
    { name: "Turf supply & lay", items: [{ desc: "Labour — turf preparation & laying (per sqm)", qty: 50, unit_cost: 18, markup: 0 }, { desc: "Turf (per sqm)", qty: 50, unit_cost: 9, markup: 15 }, { desc: "Soil preparation & materials", qty: 1, unit_cost: 280, markup: 15 }] },
    { name: "Garden clean-up", items: [{ desc: "Labour — general garden clean-up (hrs)", qty: 4, unit_cost: 75, markup: 0 }, { desc: "Disposal / skip", qty: 1, unit_cost: 150, markup: 0 }] },
    { name: "Retaining wall (timber)", items: [{ desc: "Labour — retaining wall construction", qty: 8, unit_cost: 85, markup: 0 }, { desc: "Sleepers & materials", qty: 1, unit_cost: 620, markup: 15 }] },
    { name: "Irrigation system install", items: [{ desc: "Labour — irrigation installation", qty: 6, unit_cost: 85, markup: 0 }, { desc: "Irrigation components & fittings", qty: 1, unit_cost: 380, markup: 20 }] },
  ],
  concreter: [
    { name: "Concrete slab", items: [{ desc: "Labour — formwork & pour (per sqm)", qty: 30, unit_cost: 45, markup: 0 }, { desc: "Concrete (ready-mix)", qty: 1, unit_cost: 850, markup: 0 }, { desc: "Reo mesh & steel", qty: 1, unit_cost: 320, markup: 15 }] },
    { name: "Exposed aggregate driveway", items: [{ desc: "Labour — exposed aggregate (per sqm)", qty: 40, unit_cost: 55, markup: 0 }, { desc: "Concrete & aggregate", qty: 1, unit_cost: 1100, markup: 0 }, { desc: "Formwork & materials", qty: 1, unit_cost: 280, markup: 15 }] },
    { name: "Footings", items: [{ desc: "Labour — footing excavation & pour", qty: 6, unit_cost: 95, markup: 0 }, { desc: "Concrete", qty: 1, unit_cost: 480, markup: 0 }, { desc: "Reo bar & materials", qty: 1, unit_cost: 180, markup: 15 }] },
    { name: "Concrete cutting", items: [{ desc: "Concrete cutting (per lm)", qty: 10, unit_cost: 28, markup: 0 }] },
  ],
  other: [],
};

export const TRADE_CARDS = [
  { value: "electrician" as TradeType, emoji: "⚡", label: "Electrician" },
  { value: "plumber" as TradeType, emoji: "🔧", label: "Plumber" },
  { value: "carpenter" as TradeType, emoji: "🪚", label: "Carpenter" },
  { value: "builder" as TradeType, emoji: "🏗️", label: "Builder / Renovator" },
  { value: "painter" as TradeType, emoji: "🖌️", label: "Painter" },
  { value: "hvac" as TradeType, emoji: "❄️", label: "Air Con / HVAC" },
  { value: "tiler" as TradeType, emoji: "🟫", label: "Tiler" },
  { value: "landscaper" as TradeType, emoji: "🌿", label: "Landscaper" },
  { value: "concreter" as TradeType, emoji: "🧱", label: "Concreter" },
  { value: "other" as TradeType, emoji: "📦", label: "Other" },
];
