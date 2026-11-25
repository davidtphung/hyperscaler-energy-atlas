export interface OntologyNode {
  id: string;
  title: string;
  unit: string;
  traded: string;
}

export interface OntologyLayer {
  id: string;
  title: string;
  unit: string;
  traded: string;
  note: string;
  nodes?: OntologyNode[];
}

export interface GlossaryEntry {
  id: string;
  term: string;
  detail: string;
}

export const ONTOLOGY: OntologyLayer[] = [
  {
    id: "power",
    title: "Power",
    unit: "MW and MWh",
    traded: "A right to electricity, or a contract to buy it.",
    note: "The nodes under power are different things. They are listed separately. They are not added.",
    nodes: [
      {
        id: "it-load",
        title: "IT load",
        unit: "MW",
        traded: "The power the computers are planned to draw. This is not a power plant.",
      },
      {
        id: "generation",
        title: "Generation",
        unit: "MW",
        traded: "A power plant, or the output a plant is contracted to sell. This is not IT load.",
      },
      {
        id: "btm",
        title: "Behind the meter",
        unit: "MW",
        traded: "Generation on the same site as the computers. Behind the meter means it sits on the customer side of the utility meter. This is not the grid connection.",
      },
      {
        id: "grid-connection",
        title: "Grid connection",
        unit: "MW",
        traded: "A grid interconnect is the right to connect a site to the utility. The size of that connection is not the IT load and not the plant.",
      },
      {
        id: "re-matching",
        title: "Renewable matching",
        unit: "MWh matched",
        traded: "RE matching is a contract that pairs electricity use with renewable generation. It is not the electrons at the building.",
      },
    ],
  },
  {
    id: "land",
    title: "Land and powered shells",
    unit: "MW of critical IT, plus land area",
    traded: "A lease for land or a building that already has a power plan.",
    note: "Critical IT is the power for the computers, not the whole building. A triple-net lease means the tenant pays rent plus tax, insurance, and upkeep.",
  },
  {
    id: "it-capacity",
    title: "IT capacity",
    unit: "Critical IT MW",
    traded: "The right to use a planned IT load inside a building.",
    note: "This layer is the computers' power budget. It is not generation and it is not a chip count.",
  },
  {
    id: "chips",
    title: "Chips and systems",
    unit: "GPU count, named chips, and racks",
    traded: "The hardware, or a contract to deliver it.",
    note: "A GPU is a chip used for the math in a model. Named systems include H100, B200, and GB300 NVL72. A rack is a stack of machines. This page does not date a ship.",
  },
  {
    id: "time",
    title: "Compute time",
    unit: "GPU-hour",
    traded: "One graphics chip rented for one hour.",
    note: "On-demand starts now and can stop. Reserved is a commitment for a term. Spot can be interrupted. A forward is a price agreed now for a later window.",
  },
  {
    id: "output",
    title: "Output",
    unit: "Tokens, and price per million tokens",
    traded: "The text a model reads or writes.",
    note: "A token is a chunk of text. A million tokens is not a GPU-hour and not a megawatt.",
  },
];

export const CONTRACTS: GlossaryEntry[] = [
  {
    id: "spot",
    term: "Spot",
    detail: "Buy now. The price can change. The seller may stop you.",
  },
  {
    id: "reserved",
    term: "Reserved",
    detail: "Pay for a term of capacity, whether or not you use every hour.",
  },
  {
    id: "take-or-pay",
    term: "Take-or-pay lease",
    detail: "You pay for the capacity in the lease even if you do not use it.",
  },
  {
    id: "forward",
    term: "Forward or futures",
    detail: "A price agreed now for later delivery. A future is a standardized forward traded on an exchange.",
  },
  {
    id: "prediction",
    term: "Prediction market",
    detail: "A contract that pays if a stated claim comes true. The price is an implied chance, not a measurement.",
  },
];

export const ACTORS: GlossaryEntry[] = [
  {
    id: "hyperscaler",
    term: "Hyperscaler",
    detail: "A very large cloud company that buys power and builds campuses.",
  },
  {
    id: "neocloud",
    term: "Neocloud",
    detail: "A newer cloud that mainly rents GPUs.",
  },
  {
    id: "colo",
    term: "Colo",
    detail: "Short for colocation. A landlord that rents space and power. The customer still owns the computers.",
  },
  {
    id: "miner",
    term: "Miner turned AI host",
    detail: "A company that used chips to mine crypto and now rents those chips for AI.",
  },
  {
    id: "utility",
    term: "Utility",
    detail: "The power company that delivers electricity and grants a grid connection.",
  },
  {
    id: "vendor",
    term: "Chip vendor",
    detail: "The company that designs or sells the GPUs.",
  },
  {
    id: "exchange",
    term: "Marketplace or exchange",
    detail: "A place that lists many sellers' prices, or that matches buyers and sellers.",
  },
];

export const GLOSSARY: GlossaryEntry[] = [
  { id: "mw", term: "MW and MWh", detail: "A megawatt is a rate of power. A megawatt-hour is energy, the rate times time." },
  { id: "ppa", term: "PPA", detail: "A power purchase agreement. A contract to buy electricity from a named plant or portfolio." },
  { id: "btm", term: "BTM", detail: "Behind the meter. Generation on the customer side of the utility meter, at the same site as the computers." },
  { id: "interconnect", term: "Grid interconnect", detail: "The right to connect a site to the utility grid. It is a connection size, not the IT load." },
  { id: "re", term: "RE matching", detail: "A contract that pairs use with renewable generation. It does not mean those electrons arrived at the building." },
  { id: "critical", term: "Critical IT", detail: "The power budget for the computers. It leaves out cooling and the rest of the building unless a source says otherwise." },
  { id: "nnn", term: "Triple-net", detail: "A lease where the tenant pays rent plus tax, insurance, and upkeep." },
  { id: "gpu-hour", term: "GPU-hour", detail: "One GPU rented for one hour." },
  { id: "ondemand", term: "On-demand", detail: "Start now. Stop when you want. The posted price can change." },
  { id: "reserved", term: "Reserved", detail: "A commitment to pay for capacity over a term." },
  { id: "spot", term: "Spot", detail: "A price for capacity right now. The seller can interrupt it." },
  { id: "forward", term: "Forward", detail: "A price set now for delivery in a later window." },
  { id: "token", term: "Token", detail: "A chunk of text a model reads or writes. Price per million tokens is a price for that output." },
];
