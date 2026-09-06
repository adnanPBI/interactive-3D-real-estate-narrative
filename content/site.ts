export type ProjectCategory = "Manufacturing" | "Power Generation" | "Data Centers" | "Recycling";
export type ProjectRegion = "United States" | "India" | "Southeast Asia" | "Africa";

export const siteIdentity = {
  name: "Convalt Energy",
  legalName: "Convalt Energy, Inc.",
  url: "https://www.convalt.com",
  email: "info@convalt.com",
  phone: "+1.212.683.0400",
  parent: "ACO Investment Group LLC",
  address: {
    streetAddress: "1185 Avenue of the Americas, 3rd Floor",
    addressLocality: "New York",
    addressRegion: "NY",
    postalCode: "10036",
    addressCountry: "US"
  }
} as const;

export const chapters = [
  {
    id: "hero",
    align: "left",
    kicker: "Integrated Energy Company",
    title: "Infrastructure for energy, industry and compute.",
    body: "Convalt connects advanced solar manufacturing, renewable power, data center infrastructure and circular material recovery in one long-horizon platform."
  },
  {
    id: "manufacturing",
    align: "left",
    kicker: "01 · Manufacturing",
    title: "Advanced solar manufacturing, built in America.",
    body: "A domestic manufacturing platform centered on high-efficiency solar technology and a more resilient U.S. supply chain."
  },
  {
    id: "generation",
    align: "right",
    kicker: "02 · Power Generation",
    title: "Power projects across demanding markets.",
    body: "Utility-scale solar, waste-to-energy, storage and hybrid infrastructure developed across the United States and international markets."
  },
  {
    id: "data-centers",
    align: "left",
    kicker: "03 · Data Centers",
    title: "Land, power and digital infrastructure planned together.",
    body: "Turnkey data center campuses designed around secured sites, power, cooling, water and network infrastructure."
  },
  {
    id: "recycling",
    align: "right",
    kicker: "04 · Recycling",
    title: "A circular path for solar materials.",
    body: "Solar recycling facilities are planned to recover and return critical materials to the renewable-energy manufacturing chain."
  },
  {
    id: "close",
    align: "left",
    kicker: "Project Pipeline",
    title: "Construct with capital and conscience.",
    body: "Explore Convalt's portfolio across manufacturing, generation, digital infrastructure and recycling."
  }
] as const;

export type ProjectRecord = {
  slug: string;
  title: string;
  region: ProjectRegion;
  location: string;
  category: ProjectCategory;
  status: "Under Development" | "Operating" | "On Hold" | "Sold";
  capacity: string;
  summary: string;
  metrics: ReadonlyArray<{ label: string; value: string }>;
  secondaryCategories?: ReadonlyArray<ProjectCategory>;
};

export const projects: ReadonlyArray<ProjectRecord> = [
  {
    slug: "project-solis",
    title: "Project Solis",
    region: "United States",
    location: "New Mexico, U.S.A.",
    category: "Manufacturing",
    status: "Under Development",
    capacity: "3.6 GW",
    summary: "A planned HJT solar cell and module manufacturing campus intended to expand domestic high-efficiency solar production and strengthen the U.S. supply chain.",
    metrics: [
      { label: "Nameplate capacity", value: "3.6 GW" },
      { label: "Surface area", value: "Approx. 2,500,000 sq ft" },
      { label: "Published project value", value: "$675 million" }
    ]
  },
  {
    slug: "convalt-watertown-factory",
    title: "Convalt Watertown Factory",
    region: "United States",
    location: "Watertown, New York, U.S.A.",
    category: "Manufacturing",
    status: "On Hold",
    capacity: "2 GW",
    summary: "A planned HJT solar manufacturing facility in upstate New York designed for large-scale domestic cell and module production.",
    metrics: [
      { label: "Nameplate capacity", value: "2 GW of modules" },
      { label: "Surface area", value: "2,200,000 sq ft" },
      { label: "Published preferred equity value", value: "$400 million" }
    ]
  },
  {
    slug: "river-drivers-solar",
    title: "River Drivers Solar",
    region: "United States",
    location: "East Millinocket, Maine, U.S.A.",
    category: "Power Generation",
    status: "Under Development",
    capacity: "12 MW",
    summary: "A community solar development in East Millinocket planned in phases to serve residents and businesses with locally generated electricity.",
    metrics: [
      { label: "Nameplate capacity", value: "12 MW" },
      { label: "Off-taker", value: "Community solar & direct consumers" },
      { label: "Surface area", value: "21.5+ acres" },
      { label: "Published investment", value: "$6 million" }
    ]
  },
  {
    slug: "new-mexico-panel-recycling",
    title: "New Mexico Panel Recycling",
    region: "United States",
    location: "New Mexico, U.S.A.",
    category: "Recycling",
    status: "Under Development",
    capacity: "1 GW",
    summary: "A planned solar recycling facility intended to sit alongside Convalt's New Mexico manufacturing operations and support circular material recovery.",
    metrics: [
      { label: "Nameplate capacity", value: "1 GW" },
      { label: "Surface area", value: "10+ acres" },
      { label: "Published investment", value: "$5 million" }
    ]
  },
  {
    slug: "northern-maine-data-center",
    title: "Northern Maine Data Center",
    region: "United States",
    location: "Northern Maine, U.S.A.",
    category: "Data Centers",
    status: "Under Development",
    capacity: "500 MW phase 1",
    summary: "A large northern Maine data center campus concept built around secured land, water access and behind-the-meter power, with multi-phase expansion potential.",
    metrics: [
      { label: "Phase 1 power", value: "500 MW" },
      { label: "Phase 2 potential", value: "Up to 2 GW" },
      { label: "Surface area", value: "Approx. 10,000 acres" },
      { label: "Published investment", value: "$1 billion+" }
    ]
  },
  {
    slug: "redan-waste-to-energy",
    title: "Redan Waste-to-Energy",
    region: "India",
    location: "Palamaner, Andhra Pradesh, India",
    category: "Power Generation",
    status: "Operating",
    capacity: "7.5 MW",
    summary: "An operating industrial-waste-to-power facility in Andhra Pradesh with a published commercial operation date in 2015.",
    metrics: [
      { label: "Nameplate capacity", value: "7.5 MW" },
      { label: "Off-taker", value: "Andhra Pradesh Southern Power Distribution Corporation Limited" },
      { label: "Surface area", value: "14 acres" },
      { label: "Published investment", value: "$8.3 million" }
    ]
  },
  {
    slug: "vizhag-waste-to-energy",
    title: "Vizhag Waste-to-Energy",
    region: "India",
    location: "Kothavalasa Village, Vizianagaram, Andhra Pradesh, India",
    category: "Power Generation",
    status: "Under Development",
    capacity: "7.5 MW",
    summary: "A proposed 7.5 MW waste-to-power project in Andhra Pradesh that remains in development and financing activity.",
    metrics: [
      { label: "Nameplate capacity", value: "7.5 MW" },
      { label: "Off-taker", value: "Andhra Pradesh Southern Power Distribution Corporation Limited" },
      { label: "Surface area", value: "14 acres" },
      { label: "Published investment", value: "$8.3 million" }
    ]
  },
  {
    slug: "mandalay-solar",
    title: "Mandalay Solar",
    region: "Southeast Asia",
    location: "Mandalay Region, Myanmar",
    category: "Power Generation",
    status: "Sold",
    capacity: "300 MW",
    summary: "A 300 MW AC solar development in Myanmar structured across two sites and multiple utility-scale photovoltaic blocks.",
    metrics: [
      { label: "Nameplate capacity", value: "300 MW" },
      { label: "Off-taker", value: "Electric Power Generation Enterprise (EPGE)" },
      { label: "Surface area", value: "1,000 + 850 acres" },
      { label: "Published investment", value: "$250 million" }
    ]
  },
  {
    slug: "lao-solar-project",
    title: "Lao Solar Project",
    region: "Southeast Asia",
    location: "Attapeu Province, Lao P.D.R.",
    category: "Power Generation",
    status: "Under Development",
    capacity: "1.2 GW",
    summary: "A large-scale solar development in southern Laos with published approvals for up to 1.2 GW and ongoing feasibility and development work.",
    metrics: [
      { label: "Nameplate capacity", value: "1,200 MW" },
      { label: "Off-taker", value: "Vietnam Electricity (EVN)" },
      { label: "Surface area", value: "4,400 acres" },
      { label: "Published investment", value: "$1.3 billion" }
    ]
  },
  {
    slug: "chad-solar-project",
    title: "Chad Solar Project",
    region: "Africa",
    location: "N'Djamena, Republic of Chad",
    category: "Power Generation",
    status: "Under Development",
    capacity: "120 MW",
    summary: "A proposed solar project serving the N'Djamena region, with battery storage contemplated as part of the development concept.",
    metrics: [
      { label: "Nameplate capacity", value: "120 MW" },
      { label: "Off-taker", value: "Direct to consumer" },
      { label: "Surface area", value: "300 acres" },
      { label: "Published investment", value: "$250 million" }
    ]
  },
  {
    slug: "chad-rural-electrification",
    title: "Chad Rural Electrification",
    region: "Africa",
    location: "Multiple locations, Republic of Chad",
    category: "Power Generation",
    status: "Under Development",
    capacity: "30 MW",
    summary: "A distributed solar electrification program proposed across multiple locations in Chad.",
    metrics: [
      { label: "Nameplate capacity", value: "30 MW" },
      { label: "Off-taker", value: "Direct to consumer" },
      { label: "Surface area", value: "150 acres" },
      { label: "Published investment", value: "$30 million" }
    ]
  },
  {
    slug: "sierra-leone-solar",
    title: "Sierra Leone Solar Project",
    region: "Africa",
    location: "Seven cities across Sierra Leone",
    category: "Power Generation",
    status: "Under Development",
    capacity: "60 MW",
    summary: "A proposed multi-location rural electrification portfolio totaling 60 MW, with firming resources planned to support reliable supply.",
    metrics: [
      { label: "Nameplate capacity", value: "60 MW" },
      { label: "Off-taker", value: "Direct to consumer" },
      { label: "Surface area", value: "Approx. 300 acres in aggregate" },
      { label: "Published investment", value: "$100 million" }
    ]
  },
  {
    slug: "project-kobong",
    title: "Project Kobong Hybrid Infrastructure",
    region: "Africa",
    location: "Katse Dam Region, Kingdom of Lesotho",
    category: "Power Generation",
    secondaryCategories: ["Data Centers"],
    status: "Under Development",
    capacity: "Multi-GW platform",
    summary: "An integrated Lesotho platform combining renewable generation, transmission, battery storage, fiber infrastructure and a large AI data center component.",
    metrics: [
      { label: "Pumped storage hydro", value: "1,200 MW" },
      { label: "Solar platform", value: "4,300 MW published project scope" },
      { label: "Battery storage", value: "400 MWh published project scope" },
      { label: "AI data center", value: "Up to 1.2 GW" },
      { label: "Published investment", value: "$6.2 billion estimated" }
    ]
  }
] as const;

export type TeamMember = { name: string; title: string };
export type TeamGroup = { group: string; members: ReadonlyArray<TeamMember> };

export const teamGroups: ReadonlyArray<TeamGroup> = [
  {
    group: "Directors",
    members: [
      { name: "Hari Achuthan", title: "Founder, President & CEO" },
      { name: "Richard A. Gephardt", title: "Director and Shareholder" },
      { name: "Bill Nelson", title: "Director and Shareholder" },
      { name: "Jeffrey LeSage", title: "Director and Shareholder" },
      { name: "Mark Berti", title: "Director and Shareholder" }
    ]
  },
  {
    group: "Management Team",
    members: [
      { name: "Under Selection", title: "Chief Financial Officer" },
      { name: "Matthew Morris", title: "Group Chief Operations Officer" },
      { name: "Stephen Shea", title: "CTO & Chief Scientist" },
      { name: "Mirko Kehr", title: "Head of Innovation and Engineering" },
      { name: "Anne Nürnberger", title: "Innovation & Development Engineering" },
      { name: "Theo Bache", title: "Capital Formation" }
    ]
  },
  {
    group: "Development Team",
    members: [{ name: "Tord E. Corfitz Thott", title: "Strategy & Business Development" }]
  },
  {
    group: "Operations Team",
    members: [
      { name: "Richard Angotti", title: "Operations Manager - Maine" },
      { name: "Lin Khant Oo", title: "Project Manager - Strategy Planning" },
      { name: "John Phelan", title: "Corporate Finance - Contract Management" },
      { name: "Jessie Walters", title: "Operations Manager - Maintenance" },
      { name: "Darren Bishop", title: "Project Manager - Sales Lead" },
      { name: "Maik Felber", title: "Project Management" },
      { name: "Thiru Ramachandran", title: "Country Director - India" },
      { name: "D. Srikanth", title: "Head of Operations - India" },
      { name: "J. Manohar Mummaneni", title: "Chief Administrative Officer - India" },
      { name: "CS Asha Krishnaraju", title: "Associate Company Secretary" }
    ]
  },
  {
    group: "Senior Advisors",
    members: [
      "Chris Brooks", "Thomas Eriksson", "Karen Gephardt", "Victoria L. Harmon", "Manish Jotwani", "Harri Koponen", "Don Pollard", "Todd Sandoz", "Ed Strobel", "Frank van den Bosch"
    ].map((name) => ({ name, title: "Senior Advisor" }))
  },
  {
    group: "Government Affairs",
    members: [{ name: "Machut Shishak", title: "Governmental Affairs" }]
  }
] as const;

export const mediaItems = [
  { date: "2026-08-02", type: "Power Generation News", outlet: "External coverage", title: "US companies win billions in African data center deals in direct competition with China", summary: "Coverage of U.S.-backed African infrastructure transactions, including Convalt's Lesotho energy and AI data center platform." },
  { date: "2026-07-31", type: "Power Generation News", outlet: "Convalt / U.S. Embassy Maseru", title: "U.S. Embassy Maseru celebrates historic Kobong project", summary: "Coverage of the public event marking the approved Convalt agreement for the Lesotho Kobong platform." },
  { date: "2026-07-24", type: "News", outlet: "Public Eye News", title: "Lesotho Article", summary: "Recent coverage connected to Convalt's energy and digital infrastructure development activity." },
  { date: "2026-07-24", type: "Manufacturing News", outlet: "Gallup Sun", title: "Solar energy manufacturing company eyes Gallup for major campus", summary: "Coverage of Convalt's proposed New Mexico manufacturing expansion." },
  { date: "2026-07-15", type: "News", outlet: "City of Gallup", title: "Gallup City Public Session", summary: "Public-session coverage associated with the proposed New Mexico campus." },
  { date: "2026-07-14", type: "News", outlet: "City of Gallup", title: "Gallup City Council Meeting", summary: "Public meeting coverage associated with the New Mexico project discussion." },
  { date: "2026-06-08", type: "Power Generation News", outlet: "External coverage", title: "Convalt Energy Lesotho", summary: "Coverage of the proposed multi-billion-dollar hydropower, solar and AI data center platform in Lesotho." }
] as const;

export const pressReleases = [
  {
    date: "2026-07-31",
    title: "U.S. Embassy Maseru Celebrates Historic $6.2 Billion Kobong Project with Convalt",
    summary: "The public announcement highlighted the Convalt agreement supporting a major integrated clean-energy and AI data-center development in Lesotho."
  },
  {
    date: "2026-06-08",
    title: "Convalt Energy and Government of Lesotho Announce Partnership to Develop Renewable Energy and Digital Infrastructure Projects",
    summary: "Convalt announced a binding agreement framework covering renewable generation, solar, storage and large-scale digital infrastructure in Lesotho."
  }
] as const;

export const resourceGroups = [
  {
    title: "U.S. Module Manufacturers",
    links: [
      { label: "Solar Power World", href: "https://www.solarpowerworldonline.com/" },
      { label: "SolarReviews", href: "https://www.solarreviews.com/" },
      { label: "SolarFeeds", href: "https://www.solarfeeds.com/" }
    ]
  },
  {
    title: "Energy Tax Credits",
    links: [
      { label: "Internal Revenue Service", href: "https://www.irs.gov/credits-and-deductions" },
      { label: "U.S. Department of Energy", href: "https://www.energy.gov/save" }
    ]
  },
  {
    title: "Raw Materials Price Data",
    links: [
      { label: "PVinsights", href: "https://www.pvinsights.com/" },
      { label: "EnergyTrend", href: "https://www.energytrend.com/" },
      { label: "PV Time", href: "https://www.pvtime.org/" },
      { label: "Bernreuter Research", href: "https://www.bernreuter.com/" },
      { label: "InfoLink Consulting", href: "https://www.infolink-group.com/" }
    ]
  },
  {
    title: "U.S. Customs and Border Protection",
    links: [
      { label: "Trade", href: "https://www.cbp.gov/trade" },
      { label: "Uyghur Forced Labor Prevention Act", href: "https://www.cbp.gov/trade/forced-labor/UFLPA" }
    ]
  }
] as const;

export type OfficeRecord = {
  region: string;
  name: string;
  address: ReadonlyArray<string>;
  email?: string;
  phone?: string;
};

export const offices: ReadonlyArray<OfficeRecord> = [
  { region: "United States", name: "Head Office", address: ["1185 Avenue of the Americas, 3rd Floor", "New York, NY 10036, USA"], email: "info@convalt.com", phone: "+1.212.683.0400" },
  { region: "United States", name: "Washington, DC", address: ["1025 Thomas Jefferson St NW", "Suite 400 West", "Washington, DC 20007"], phone: "+1.212.683.0400" },
  { region: "United States", name: "Watertown", address: ["800 Starbuck Avenue, A-15", "Watertown, NY 13601"], phone: "+1.212.683.0400" },
  { region: "United States", name: "Maine", address: ["31 North Street", "East Millinocket, ME 04430"], phone: "+1.212.683.0400" },
  { region: "United States", name: "Oregon", address: ["12745 SW Millikan Way, Suite 300", "Beaverton, OR 97005"], phone: "+1.212.683.0400" },
  { region: "Europe", name: "Convalt Energy Germany", address: ["Freisstrasse 20", "Frankfurt 60388, Germany"] },
  { region: "Asia", name: "Convalt Energy Laos", address: ["No. 588, Unit 27, Thongkang Village", "Sisattanak District, Vientiane"] },
  { region: "Asia", name: "Convalt Energy India", address: ["39/19 Aspen Court, 3rd Floor, 6th Main Road", "R.A. Puram, Chennai, Tamil Nadu 600 028"] },
  { region: "Asia", name: "Convalt Energy Asia Private Limited", address: ["Ocean Financial Centre, Level 40", "10 Collyer Quay, Singapore 049315"] },
  { region: "Africa", name: "Convalt Energy Republic of Chad", address: ["Quartier Klemat, Rue Général Daoud Soumaïne", "N'Djamena"] },
  { region: "Africa", name: "Convalt Energy Sierra Leone", address: ["67 Sir Samuel Lewis Road", "Aberdeen, Freetown"] }
];

export const businessUnits = ["Manufacturing", "Power Generation", "Data Centers", "Recycling", "Corporate / Other"] as const;
export const teamInterests = ["Directors", "Management", "Development", "Operations", "Senior Advisors", "Government Affairs", "General Enquiry"] as const;
