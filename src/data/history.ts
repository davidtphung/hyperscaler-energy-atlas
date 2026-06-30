import type { HistoryMilestone } from "../types";

// History of data centers, from the mainframe era to the AI factory era.

export const HISTORY: HistoryMilestone[] = [
  {
    "id": "eniac-1945",
    "year": 1945,
    "era": "mainframe",
    "title": "ENIAC, the first electronic computer room",
    "description": "ENIAC, the first programmable general-purpose electronic computer, was completed in 1945 at the University of Pennsylvania, filling a large room with roughly 18,000 vacuum tubes. It established the dedicated machine room as the ancestor of the data center.",
    "type": "milestone",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/ENIAC",
    "confidence": "high"
  },
  {
    "id": "system360-1964",
    "year": 1964,
    "era": "mainframe",
    "title": "IBM System/360 announced",
    "description": "IBM unveiled the System/360 family on April 7, 1964, the first compatible line spanning small to large machines that standardized the 8-bit byte. It made the climate-controlled mainframe room the corporate computing standard.",
    "type": "technology",
    "sourceName": "IBM",
    "sourceUrl": "https://www.ibm.com/history/system-360",
    "confidence": "high"
  },
  {
    "id": "pdp8-1965",
    "year": 1965,
    "era": "client-server",
    "title": "DEC PDP-8, the first successful minicomputer",
    "description": "Digital Equipment Corporation introduced the PDP-8 on March 22, 1965, the first commercially successful minicomputer at $18,500. It let departments own computers rather than rent mainframe time, seeding distributed computing.",
    "type": "technology",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/PDP-8",
    "confidence": "high"
  },
  {
    "id": "arpanet-1969",
    "year": 1969,
    "era": "client-server",
    "title": "First ARPANET node installed at UCLA",
    "description": "The first ARPANET Interface Message Processor was installed at UCLA in 1969, and the first host-to-host message traveled to Stanford Research Institute on October 29. This packet-switched link was the direct ancestor of the internet that data centers would serve.",
    "type": "milestone",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/ARPANET",
    "confidence": "high"
  },
  {
    "id": "ethernet-1973",
    "year": 1973,
    "era": "client-server",
    "title": "Ethernet invented at Xerox PARC",
    "description": "Robert Metcalfe and David Boggs ran the first Ethernet local area network at Xerox PARC on May 22, 1973, at 2.94 Mbps. Ethernet became the dominant wiring of LANs and the interconnect fabric inside every modern data center.",
    "type": "technology",
    "sourceName": "IEEE ETHW",
    "sourceUrl": "https://ethw.org/Milestones:Ethernet_Local_Area_Network_(LAN),_1973-1985",
    "confidence": "high"
  },
  {
    "id": "telehouse-1989",
    "year": 1989,
    "era": "dotcom",
    "title": "Telehouse founded, Europe's first carrier-neutral colocation",
    "description": "KDDI established Telehouse in 1989, and its Telehouse North site in London Docklands opened in 1990 as Europe's first purpose-built carrier-neutral colocation facility. It pioneered the multi-tenant model of housing many networks under one neutral roof.",
    "type": "facility",
    "sourceName": "Telehouse",
    "sourceUrl": "https://www.telehouse.com/2024/09/23/telehouse-celebrates-35-years-of-global-data-center-innovation/",
    "confidence": "medium"
  },
  {
    "id": "maeeast-1992",
    "year": 1992,
    "era": "dotcom",
    "title": "MAE-East, the first commercial internet exchange",
    "description": "MAE-East began in 1992 around Washington D.C. as the first major non-governmental internet exchange point, created by MFS and UUNET. By 1997 roughly half the world's internet traffic passed through it.",
    "type": "facility",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/MAE-East",
    "confidence": "high"
  },
  {
    "id": "one-wilshire-1992",
    "year": 1992,
    "era": "dotcom",
    "title": "One Wilshire emerges as a Pacific gateway",
    "description": "As corporate tenants left in the early 1990s, telecom carriers filled One Wilshire in Los Angeles, drawn by a nearby AT&T switching center. It became the most connected internet point in the western US and a key US-to-Asia gateway.",
    "type": "facility",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/One_Wilshire",
    "confidence": "medium"
  },
  {
    "id": "exodus-1994",
    "year": 1994,
    "era": "dotcom",
    "title": "Exodus Communications founded",
    "description": "Exodus Communications was founded in 1994 and pioneered the internet data center model, hosting servers for dot-com customers including Yahoo and eBay. It peaked near a $32 billion valuation before collapsing in the 2001 bust.",
    "type": "company",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Exodus_Communications",
    "confidence": "high"
  },
  {
    "id": "linx-1994",
    "year": 1994,
    "era": "dotcom",
    "title": "London Internet Exchange (LINX) founded",
    "description": "In November 1994 five UK ISPs linked their networks to form LINX, letting British traffic stay local instead of routing across the Atlantic. It became one of the world's largest internet exchange points.",
    "type": "facility",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/London_Internet_Exchange",
    "confidence": "high"
  },
  {
    "id": "60hudson-1995",
    "year": 1995,
    "era": "dotcom",
    "title": "60 Hudson becomes a New York carrier hotel",
    "description": "60 Hudson Street, a legacy Western Union telegraph building in New York, filled with competing carriers through the mid-1990s, coining the term carrier hotel. Its meet-me rooms became one of the densest internet interconnection hubs on the East Coast.",
    "type": "facility",
    "sourceName": "DatacenterDynamics",
    "sourceUrl": "https://www.datacenterdynamics.com/en/analysis/the-rise-and-rebirth-of-carrier-hotels/",
    "confidence": "medium"
  },
  {
    "id": "uptime-tiers-1995",
    "year": 1995,
    "era": "dotcom",
    "title": "Uptime Institute Tier classification created",
    "description": "The Uptime Institute, founded in 1993 by Ken Brill, developed the data center Tier classification system in the mid-1990s to benchmark redundancy and availability. Tiers I through IV remain the global standard for data center reliability.",
    "type": "policy",
    "sourceName": "Uptime Institute",
    "sourceUrl": "https://uptimeinstitute.com/tiers",
    "confidence": "medium"
  },
  {
    "id": "equinix-1998",
    "year": 1998,
    "era": "colocation",
    "title": "Equinix founded as neutral interconnection provider",
    "description": "Jay Adelson and Al Avery founded Equinix on June 22, 1998, to build vendor-neutral IBX data centers where any network could interconnect. It grew into the world's largest colocation and interconnection platform.",
    "type": "company",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Equinix",
    "confidence": "high"
  },
  {
    "id": "akamai-1998",
    "year": 1998,
    "era": "colocation",
    "title": "Akamai founded, birth of the CDN",
    "description": "Akamai was incorporated in 1998 out of MIT research by Tom Leighton and Danny Lewin, building the first large content delivery network of distributed edge servers. It pioneered pushing content closer to users to beat congestion.",
    "type": "company",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Akamai_Technologies",
    "confidence": "high"
  },
  {
    "id": "equinix-ashburn-1999",
    "year": 1999,
    "era": "colocation",
    "title": "Equinix opens its first Ashburn IBX",
    "description": "Equinix opened its first Ashburn, Virginia IBX data center on July 27, 1999, anchoring what became Data Center Alley. The Loudoun County cluster grew into the densest internet hub on Earth.",
    "type": "facility",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Equinix",
    "confidence": "high"
  },
  {
    "id": "google-dalles-2006",
    "year": 2006,
    "era": "cloud-hyperscale",
    "title": "Google's The Dalles data center",
    "description": "Google built its first custom data center in The Dalles, Oregon, opening in 2006 beside the Columbia River for cheap hydropower. It set the template for the purpose-built hyperscale facility.",
    "type": "facility",
    "sourceName": "Google",
    "sourceUrl": "https://datacenters.google/locations/oregon/",
    "confidence": "high"
  },
  {
    "id": "aws-ec2-2006",
    "year": 2006,
    "era": "cloud-hyperscale",
    "title": "Amazon EC2 launches public beta",
    "description": "Amazon Web Services launched the Elastic Compute Cloud (EC2) in limited public beta on August 25, 2006, letting anyone rent virtual servers by the hour. It was the first practical implementation of cloud computing as infrastructure.",
    "type": "milestone",
    "sourceName": "AWS",
    "sourceUrl": "https://aws.amazon.com/about-aws/whats-new/2006/08/24/announcing-amazon-elastic-compute-cloud-amazon-ec2---beta/",
    "confidence": "high"
  },
  {
    "id": "warehouse-scale-2009",
    "year": 2009,
    "era": "cloud-hyperscale",
    "title": "The warehouse-scale computer concept",
    "description": "Google's Luiz Andre Barroso and Urs Holzle published The Datacenter as a Computer in 2009, framing the data center itself as a single warehouse-scale machine. It defined the design discipline behind hyperscale infrastructure.",
    "type": "milestone",
    "sourceName": "Google Research",
    "sourceUrl": "https://research.google/pubs/the-datacenter-as-a-computer-an-introduction-to-the-design-of-warehouse-scale-machines/",
    "confidence": "high"
  },
  {
    "id": "azure-2010",
    "year": 2010,
    "era": "cloud-hyperscale",
    "title": "Microsoft Azure becomes commercially available",
    "description": "Windows Azure became commercially available on February 1, 2010, establishing Microsoft as a major hyperscale cloud operator alongside AWS and Google. It extended the company's data center footprint into on-demand cloud infrastructure.",
    "type": "milestone",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Microsoft_Azure",
    "confidence": "high"
  },
  {
    "id": "cloudflare-2010",
    "year": 2010,
    "era": "edge",
    "title": "Cloudflare launches its global edge network",
    "description": "Cloudflare, founded in 2009, launched publicly at TechCrunch Disrupt in September 2010 and began building a worldwide network of edge points of presence. It made edge security and caching available to any website for free.",
    "type": "company",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Cloudflare",
    "confidence": "high"
  },
  {
    "id": "open-compute-2011",
    "year": 2011,
    "era": "cloud-hyperscale",
    "title": "Facebook launches the Open Compute Project",
    "description": "On April 7, 2011, Facebook launched the Open Compute Project and open-sourced the designs of its Prineville, Oregon data center, which hit a 1.07 PUE. OCP made vanity-free, efficient hardware an industry-wide standard.",
    "type": "technology",
    "sourceName": "Meta",
    "sourceUrl": "https://about.fb.com/news/2011/04/facebook-launches-open-compute-project/",
    "confidence": "high"
  },
  {
    "id": "prineville-2011",
    "year": 2011,
    "era": "cloud-hyperscale",
    "title": "Facebook's Prineville data center opens",
    "description": "Facebook opened its first wholly owned data center in Prineville, Oregon in 2011, a facility run by a skeleton crew at record efficiency. It demonstrated the self-built hyperscale campus model.",
    "type": "facility",
    "sourceName": "Engineering at Meta",
    "sourceUrl": "https://engineering.fb.com/2011/04/07/data-center-engineering/building-efficient-data-centers-with-the-open-compute-project/",
    "confidence": "high"
  },
  {
    "id": "nvidia-dgx1-2016",
    "year": 2016,
    "era": "ai-factory",
    "title": "Nvidia hand-delivers the first DGX-1 to OpenAI",
    "description": "Nvidia announced the DGX-1, an eight-GPU AI supercomputer in a box, on April 6, 2016, and Jensen Huang hand-delivered the first unit to OpenAI that August. It marked the start of purpose-built AI compute appliances.",
    "type": "technology",
    "sourceName": "Nvidia",
    "sourceUrl": "https://nvidianews.nvidia.com/news/nvidia-launches-world-s-first-deep-learning-supercomputer",
    "confidence": "high"
  },
  {
    "id": "colossus-2024",
    "year": 2024,
    "era": "ai-factory",
    "title": "xAI Colossus brought online in Memphis",
    "description": "xAI launched its Colossus supercomputer in a former Electrolux plant in Memphis in September 2024, wiring up 100,000 Nvidia H100 GPUs in 122 days to train Grok. It then doubled to 200,000 GPUs within months on a path toward one million.",
    "type": "facility",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/wiki/Colossus_(supercomputer)",
    "confidence": "high"
  },
  {
    "id": "dgx-colossus-networking-2024",
    "year": 2024,
    "era": "ai-factory",
    "title": "Spectrum-X Ethernet scales the largest AI cluster",
    "description": "Nvidia and xAI used Spectrum-X Ethernet to interconnect the 100,000-plus GPUs of Colossus into a single training fabric, announced in October 2024. It showed Ethernet scaling to the largest AI supercomputer then built.",
    "type": "technology",
    "sourceName": "Nvidia",
    "sourceUrl": "https://nvidianews.nvidia.com/news/spectrum-x-ethernet-networking-xai-colossus",
    "confidence": "high"
  },
  {
    "id": "stargate-2025",
    "year": 2025,
    "era": "ai-factory",
    "title": "The $500 billion Stargate project announced",
    "description": "OpenAI, SoftBank, Oracle, and MGX announced the Stargate joint venture on January 21, 2025, pledging up to $500 billion for US AI infrastructure. Its flagship Abilene, Texas campus came online later that year.",
    "type": "milestone",
    "sourceName": "CNBC",
    "sourceUrl": "https://www.cnbc.com/2025/09/23/openai-first-data-center-in-500-billion-stargate-project-up-in-texas.html",
    "confidence": "high"
  },
  {
    "id": "meta-hyperion-2025",
    "year": 2025,
    "era": "ai-factory",
    "title": "Meta announces 5-gigawatt Hyperion campus",
    "description": "Mark Zuckerberg revealed in July 2025 that Meta is building Hyperion, a roughly 5-gigawatt AI data center in Richland Parish, Louisiana spanning thousands of acres. It exemplified the gigawatt-scale AI campus drawing more power than some states.",
    "type": "facility",
    "sourceName": "TechCrunch",
    "sourceUrl": "https://techcrunch.com/2025/07/14/mark-zuckerberg-says-meta-is-building-a-5gw-ai-data-center/",
    "confidence": "high"
  },
  {
    "id": "stargate-expansion-2025",
    "year": 2025,
    "era": "ai-factory",
    "title": "Stargate expands to seven gigawatts of sites",
    "description": "In September 2025 OpenAI, Oracle, and SoftBank added five new Stargate sites across Texas, New Mexico, Ohio, and the Midwest, pushing planned capacity toward seven gigawatts. It signaled the multi-gigawatt AI factory build-out underway across the US.",
    "type": "facility",
    "sourceName": "OpenAI",
    "sourceUrl": "https://openai.com/index/five-new-stargate-sites/",
    "confidence": "high"
  }
];
