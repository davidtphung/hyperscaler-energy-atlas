# China AI data center candidates (companies)

Date: 2026-09-24. Research only. No live data edit, no gh-pages, no deploy.

Source bar: HKEX, SSE, SZSE, SEC 20-F or 6-K, company releases, national or provincial notices, EIA disclosures, grid filings. Press is secondary. No invented MW. Rack counts, server counts, PUE, kWh, MVA, and EFLOPS or PFLOPS stay in the note and are not converted. Investment renminbi is not MW. "Up to", planned totals, and campus slogans are announced only. Status is construction or operating only when a primary source shows that. Approximate filing figures use bound `approx_filing`.

Kinds stay separate: `it_capacity` (data center IT or wholesale capacity the filing presents as MW in service), `btm_gen` (on-site generation), `utility_load` (substation or expected facility electrical load), `storage`, `program`, `equipment_supply`, `unresolved`.

## Counts by verdict

| Verdict | Rows |
| --- | --- |
| APPEND | 6 |
| HOLD | 12 |
| REJECT | 10 |

APPEND means a primary source states a megawatt and shows construction or operation, and the figure is not already an Atlas row.

## China rows already on the Atlas

Do not add these again.

### Commitments (`src/data/commitments.ts`), country China: 6

| id | actor | project | MW | kind | status | source |
| --- | --- | --- | --- | --- | --- | --- |
| alibaba-zhangbei-renewable | Alibaba | Zhangbei renewable-powered cluster | 200 | it_capacity | operational | Alibaba Cloud blog (soft 404). counts no, remove_candidate |
| chindata-100-renewable-2030 | Chindata | 100 percent renewable by 2030 | none | program | announced | PR Newswire, link still returns 200 |
| baidu-carbon-neutral-2030 | Baidu | Operations carbon neutral by 2030 | none | program | announced | https://www.baidu.com/ (homepage, not the pledge) |
| gds-100-renewable-2030 | GDS | 100 percent renewable by 2030 | none | program | announced | gds-services ESG path, HTTP 404 |
| alibaba-clean-energy-2030 | Alibaba | Carbon neutrality pledge | none | program | announced | Alibaba Group document URL, HTTP 200 |
| tencent-carbon-neutral-2030 | Tencent | Carbon neutrality pledge | none | program | announced | tencent.com article, HTTP 404 |

Bloom is not a China row. `bloom-brookfield-fuel-cells` is a US equipment-supply row, up to 1,000 MW, and its source URL returns HTTP 404.

### Data centers (`src/data/datacenters.ts`), country China: 93

Operators in this research scope that already have a pin (MW if the directory stored one):

- Alibaba: Ulanqab 120 MW; Ulanqab cn-wulanchabu null; Hangzhou Feitian 60 MW; Hangzhou region null; Nantong null; Shanghai null; Zhangbei null; Chengdu null. Heyuan is not a directory row.
- Tencent: Zhangjiakou 100 MW; Shenzhen 40 MW; Gui'an Qixing null; Tianjin (two ids) null; Qingyuan null; Shanghai Songjiang/Qingpu (two ids) null; Guangzhou null; Nanjing null; Gui'an Seven Star null; Huailai null; Chengdu null; Chongqing null.
- Baidu: Beijing region null; Suzhou region null. Yangquan and Baoding are not directory rows.
- ByteDance / Volcano Engine: Zhangjiakou 90 MW; Datong (two ids) null; Wuhu null; Shanghai null; Shenzhen null. Ulanqab is only inside the mixed Grassland Cloud Valley cluster row.
- Huawei: Qingyang 70 MW construction; Gui'an null. Ulanqab and Wuhu are not directory rows.
- China Mobile: Hohhot intelligent computing null; Zhongwei null; Qingyang null; Guangzhou South Base null; Karamay null; Zhengzhou null; Qingdao null; Harbin campus null.
- China Telecom: Horinger 150 MW (two near-duplicate ids); Chengdu 50 MW; Chengdu Tianfu null; Qingyang (two ids) construction null; Shanghai null; Lanzhou null; Chongqing null; Wuhan Jinyinhu null; Changsha two null; Fuzhou null; Xiamen null; Kunming null; Nanning null; Hefei null; Dalian null; Urumqi null.
- China Unicom: Dongguan null; Horinger null; Xi'an null; Jinan null; Shenyang null.
- GDS: Shanghai 50 MW; Beijing 48 MW; SH8 null; Shunyi null; SH1 null; Kunshan null; BJ2 null; Langfang null; Foshan null; Huailai null.
- VNET: Beijing M6 null; Shanghai Waigaoqiao null. Azure China North and East are 21Vianet-operated and null MW.
- Chindata: Huailai 500 MW; Taihang Lingqiu 50 MW; Qingyang null; Ordos null (SEC exhibit already cited, MW null in the directory).

Also present, outside the company list but China: Apple Gui'an and Ulanqab, AWS Ningxia via NWCD, AWS Beijing via Sinnet, Kingsoft Qingyang, Meili Zhongwei, Wuhan AI computing center, Shaoguan cluster, Zhongwei telecom cluster.

## Top APPEND rows

1. **Range Intelligent, Pinghu, 100 MW IT, operating.** SZSE 2025 annual report (10 Apr 2026): "2025年度公司新增交付算力规模约220MW，其中包含行业首例单体100MW超大规模智算中心。" English: in 2025 the company newly delivered about 220 MW, including the industry's first single-building 100 MW hyperscale intelligent computing center. The 2024 annual report is what names Pinghu: "建设了平湖园区单体100MW和廊坊园区单体200MW两栋新一代智算中心，预计2025年完成投运。" English: it built a 100 MW Pinghu building and a 200 MW Langfang building, expected in service in 2025. The about-220 MW figure is a four-campus delivery total, not a second site.

2. **Range Intelligent, Langfang, 200 MW IT, construction.** Same 2024 filing names the Langfang 200 MW building as built and aimed at 2025 service. The 2025 report still says "加快推进行业首例单体200MW智算中心建设。" English: accelerating construction of the first single-building 200 MW center. A design line, "IT功率超200MW", is a slogan and is not used as a larger number.

3. **VNET Greater Beijing, 578 MW wholesale in service, operating.** SEC 20-F for the year ended 31 Dec 2025: Greater Beijing Area capacity in service 578 MW (65 percent). Yangtze River Delta 311 MW (35 percent). Total 889 MW.

4. **VNET Yangtze River Delta, 311 MW wholesale in service, operating.** Same table. Do not also add the 889 MW total.

5. **VNET wholesale under construction, 452 MW, construction.** Same 20-F: capacity under construction 452 MW. Pre-committed 156 MW is inside that 452.

6. **Tencent on-site renewables, 63.8 MW, operating, kind btm_gen.** HKEX ESG report filed 8 Apr 2025: "By the end of 2024, the total installed capacity of Tencent's data centres' renewable energy facilities had reached 63.8 MW." This is generation at data centres, not IT load, and not a Qingyuan or Huailai campus total.

## Replacement links for dead existing sources

Checked 24 Sep 2026.

| Atlas row | Dead URL | What it does now | Replacement primary | Does the replacement support the stored MW? |
| --- | --- | --- | --- | --- |
| alibaba-zhangbei-renewable | https://www.alibabacloud.com/blog/alibaba-cloud-zhangbei-data-center_594299 | HTTP 200 but the title is an unrelated MaxCompute article (soft 404) | Xinhua, 22 Jul 2021, http://www.news.cn/tech/20210722/21ba34f4b01a410db5c1dc94e2378a62/c.html | No. PUE below 1.25, green power above 50 percent, about 450 million kWh traded. No 200 MW. Leave the remove_candidate in place. |
| baidu-carbon-neutral-2030 | https://www.baidu.com/ | HTTP 200, Baidu homepage, not the pledge | Baidu release via PR Newswire, 22 Jun 2021, https://www.prnewswire.com/news-releases/baidu-announces-goal-to-achieve-carbon-neutral-operations-by-2030-301317231.html and 2025 ESG PDF https://esgs.cdn.bcebos.com/2026/05/17/05/080532d06118abd0b715365f9ae46689.pdf | Pledge only. No MW. |
| gds-100-renewable-2030 | https://www.gds-services.com/en/about-esg/ | HTTP 404 | SEC exhibit, 30 Nov 2021, https://www.sec.gov/Archives/edgar/data/1526125/000110465921144664/tm2134200d1_ex99-1.htm "achieve 100% renewable energy usage and carbon neutrality by 2030." IR mirror: https://investors.gds-services.com/news-releases/news-release-details/gds-releases-inaugural-esg-report-and-sets-carbon-neutral-target | Pledge only. 2025 20-F still has no China IT MW; it has about 3.7 GW of future developable resources (HOLD). |
| tencent-carbon-neutral-2030 | https://www.tencent.com/en-us/articles/2201441.html | HTTP 404 | Roadmap PDF https://static.www.tencent.com/attachments/TencentCarbonNeutralityTargetandRoadmapReport.pdf and live page https://www.tencent.com/en-us/esg/carbon-neutrality.html "carbon neutrality in its own operations and supply chain" and "green power for 100% of all electricity consumed by 2030." HKEX 2024 ESG restates the same target. | Pledge only. The new 63.8 MW figure is on-site renewable capacity, a different kind. |
| bloom-brookfield-fuel-cells | https://www.bloomenergy.com/news/bloom-energy-and-brookfield-asset-management-partner/ | HTTP 404 | 13 Oct 2025 release: https://investor.bloomenergy.com/press-releases/press-release-details/2025/Brookfield-and-Bloom-Energy-Announce-5-Billion-Strategic-AI-Infrastructure-Partnership/default.aspx "Brookfield will invest up to $5 billion to deploy Bloom's advanced fuel cell technology." 30 Jun 2026 expansion is a financing framework to $25 billion, still with no gigawatt in the release. | No. The live primary does not restate 1,000 MW. Not a China row. |

Chindata's 2030 roadmap PR Newswire URL still returns HTTP 200. It was not in the known-dead list.

## HOLD and REJECT, short

HOLD, do not add to firm totals yet:

- Range about 750 MW cumulative delivered, and about 6 GW planned. The 750 overlaps the site rows. The 6 GW is a plan.
- Range Langfang 220 kV substation, maximum supply 960 MW, in service January 2024. Grid delivery equipment, not IT and not a power plant.
- VNET 889 MW national total (sum of 578 and 311). VNET eastern China about 210 MW IT, city unnamed, may sit inside the 311.
- Alibaba at least RMB 380 billion over three years (SEC 6-K, 24 Feb 2025). Money, not MW.
- Alibaba Linping (Hangzhou): EIA expects 197 MW facility load and 217 MW equipment capacity, plus 4 x 100 MVA. Servers: 200,000. Substation not started as of April 2024. Not IT.
- Huawei Wuhu EIA: 39 x 1,800 kW backup diesels per building, three buildings, 3 x 100 MVA. Not summed. Not IT.
- GDS about 3.7 GW developable, held for future development, not under construction.
- China Telecom Qingyang Yunchuang: municipal news, "可安装15兆瓦的机架", occupancy above 99 percent. Installable racks, promotional. A planned 18 to 20 MW IT range for the larger campus is not firm.
- SenseTime Lingang storage 17.888 MW / 35.776 MWh. Storage, not IT. "25 MW+" demand response is a capability claim.
- ByteDance Ulanqab 5 to 6 GW: SCMP and reprints, preliminary talks, not a company or government primary. State-media and newsletter copies amplify it. Analyst GW totals for the whole Ulanqab cluster are not used.

REJECT:

- Heyuan annual electricity (about 1,362.66 million kWh) and PUE 1.26. Not converted.
- Zhangbei 200 MW. No primary restates it.
- Huawei Wuhu "3 million servers" and about 6,000 mu. Company marketing. Not MW. Opening date 14 Jun 2024 does not create an IT MW.
- DayOne 1,250 MW committed and 444 MW billable. Real IT MW in the GDS 20-F, Singapore platform, not China.
- Baidu Yangquan and Baoding: efficiency, kWh, and a 120 kW rack density. Xushui phase III EIA (11 Jun 2025) has no MW.
- iFlytek Feixing-1 and Feixing-2: cards and models in the SZSE annual report, no MW.
- High-Flyer / DeepSeek Firefly-2: company site has no electrical MW.
- Sugon: 61 MW is a Malaysia job. 750 kW is per rack. Not a China campus.
- Chindata Huailai "surpassing 300 MW" is a 2023 earnings-call transcript and conflicts with the Atlas 500 MW newsletter row. Not a new site.
- Zhipu and Moonshot: no primary MW found.

China Mobile Hohhot is already on the Atlas (null MW). Secondary pages cite about 19,600 kW equipment power. The China Mobile news URL and the SASAC page that were opened do not carry that kilowatt figure, so it is not appended. Harbin on those pages is card counts and EFLOPS, not MW.

## Bias notes

Range, VNET, GDS, Alibaba, Tencent, Baidu, Huawei, and SenseTime figures above are from filings or the company's own site. They are primary and also self-interested: capacity in service and "delivered MW" are commercial metrics. Qingyang government news and Xinhua Zhangbei coverage are official but promotional. ByteDance 5 to 6 GW is press built on unnamed sources plus sell-side arithmetic (yuan per GW). That chain is not a commitment.

## Plain English

Six new rows are solid enough to consider adding, and none of them are already on the map as that megawatt. Two are Range Intelligent buildings in Pinghu (100 MW, delivered) and Langfang (200 MW, still being built). Three are VNET's own SEC totals: 578 MW running in the Beijing region, 311 MW running in the Yangtze delta, and 452 MW under construction. The sixth is Tencent's 63.8 MW of renewable gear at its data centers, which is power plants on site, not the size of the computer halls. Everything else in this pass is either a plan, a battery, a substation, a yuan budget, a foreign campus, or a number that is not megawatts. The old Zhangbei 200 MW still has no document behind it.

## Action steps to review

1. Read the six APPEND quotes in `research/china/2026-09-24-companies.csv` before any Atlas edit. Add them as separate kinds. Do not add 578 and 311 and also 889.
2. Swap the four dead China pledge links (Baidu, GDS, Tencent, and the Zhangbei soft 404) for the replacement URLs. Do not put 200 MW back on Zhangbei.
3. Point the Bloom row at the October 2025 investor release and drop the 1,000 MW unless a primary that states it is found. The current release states dollars.
4. Leave Heyuan, Linping, Wuhu diesels, Qingyang 15 MW, SenseTime storage, and the ByteDance 5 to 6 GW story off the firm totals until an EIA or filing states IT megawatts and shows construction or operation.
