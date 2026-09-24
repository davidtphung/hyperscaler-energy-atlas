# China AI data center candidates: hubs and power

Date: 2026-09-24
Scope: government, hub, and power-supply sources for projects not already on the Hypergrid Atlas.
Out of scope: company-by-company hunts, live data edits, gh-pages, and PR #15.
Starting ref: `cursor/per-kind-hero-totals-f32b` at `3b535e7`.

No megawatt figure below was converted from racks, standard racks, PFLOPS, EFLOPS, annual kilowatt-hours, or investment. A permit or energy-saving review is recorded as permitted, not as construction. Hub-wide and provincial targets stay on the announced line and are not summed.

## Inventory already on the Atlas

Searched `src/data` for `country: China`. Counts: commitments 6, data centers 93, real estate 2, policy 5. History, contested, and construction have no China rows.

### Commitments

| id | actor | project | place | MW | kind | status |
|---|---|---|---|---|---|---|
| alibaba-zhangbei-renewable | Alibaba | Zhangbei renewable-powered data center cluster | Zhangbei, Hebei | 200 | it_capacity | operational |
| chindata-100-renewable-2030 | Chindata | 100 percent renewable pledge | Beijing |  | program | announced |
| baidu-carbon-neutral-2030 | Baidu | carbon neutrality pledge | Beijing |  | program | announced |
| gds-100-renewable-2030 | GDS | 100 percent renewable pledge | Shanghai |  | program | announced |
| alibaba-clean-energy-2030 | Alibaba | carbon neutrality pledge | Hangzhou |  | program | announced |
| tencent-carbon-neutral-2030 | Tencent | carbon neutrality pledge | Shenzhen |  | program | announced |

### Data centers (93)

| id | operator | facility | city | MW | status |
|---|---|---|---|---|---|
| cn-huailai-chindata | Chindata | Huailai (Guanting Lake) campus | Huailai, Zhangjiakou | 500 | operating |
| cn-horinger-china-telecom | China Telecom | Inner Mongolia Information Park (Horinger) | Horinger, Hohhot | 150 | operating |
| cn-horinger-chinatelecom-park | China Telecom | Cloud Computing Inner Mongolia Information Park | Hohhot (Horinger) | 150 | operating |
| cn-innermongolia-alibaba-ulanqab | Alibaba Cloud | Ulanqab DC | Ulanqab | 120 | operating |
| cn-zhangjiakou-tencent-zjk | Tencent Cloud | Zhangjiakou DC | Zhangjiakou | 100 | operating |
| cn-zhangjiakou-bytedance-zjk | ByteDance | Zhangjiakou DC | Zhangjiakou | 90 | operating |
| cn-gansu-qingyang-huawei | Huawei Cloud | Qingyang Cloud DC | Qingyang | 70 | construction |
| cn-hangzhou-alibaba-hz | Alibaba Cloud | Hangzhou Feitian DC | Hangzhou | 60 | operating |
| cn-datong-chindata-taihang | Chindata | Taihang Mountain Campus (Lingqiu) | Lingqiu, Datong | 50 | operating |
| cn-shanghai-gds-sh | GDS | Shanghai Campus | Shanghai | 50 | operating |
| cn-chengdu-china-telecom | China Telecom | Chengdu DC | Chengdu | 50 | operating |
| cn-beijing-gds-bj | GDS | Beijing Campus | Beijing | 48 | operating |
| cn-shenzhen-tencent-sz | Tencent Cloud | Shenzhen DC | Shenzhen | 40 | operating |
| cn-guian-tencent-qixing | Tencent Cloud | Gui'an Qixing | Gui'an |  | operating |
| cn-guian-huawei-cloud | Huawei Cloud | Gui'an | Gui'an |  | operating |
| cn-guian-apple-icloud | GCBD | Apple iCloud China (Gui'an) | Gui'an |  | operating |
| cn-ulanqab-alibaba | Alibaba Cloud | Ulanqab campus | Ulanqab |  | operating |
| cn-ulanqab-cluster-kuaishou | Multiple | Ulanqab Grassland Cloud Valley | Ulanqab |  | operating |
| cn-horinger-china-mobile | China Mobile | Hohhot Intelligent Computing Center | Horinger |  | operating |
| cn-zhongwei-aws-ningxia | NWCD | AWS China (Ningxia) | Zhongwei |  | operating |
| cn-zhongwei-china-mobile | China Mobile | Zhongwei Data Center | Zhongwei |  | operating |
| cn-qingyang-china-mobile | China Mobile | Qingyang Computing Center | Qingyang |  | operating |
| cn-qingyang-china-telecom | China Telecom | Gansu (Qingyang) Data Center | Qingyang |  | construction |
| cn-datong-bytedance-volcano | Volcano Engine | Datong AI Data Center | Guangling, Datong |  | construction |
| cn-wuhu-bytedance-volcengine | Volcano Engine | Wuhu Cluster Campus | Wuhu |  | construction |
| cn-shanghai-gds-sh8 | GDS | Shanghai SH8 | Pudong |  | operating |
| cn-beijing-gds-shunyi | GDS | Beijing Shunyi BJ10/BJ11/BJ12 | Shunyi |  | operating |
| cn-tianjin-tencent | Tencent Cloud | Tianjin High-tech Cloud DC | Tianjin |  | operating |
| cn-qingyuan-tencent-gba | Tencent Cloud | Qingyuan cluster | Qingyuan |  | operating |
| cn-shaoguan-gba-cluster | Carriers | Shaoguan National Data Center Cluster | Shaoguan |  | construction |
| cn-shanghai-tencent-songjiang | Tencent Cloud | Yangtze Delta AI Advanced Computing Center | Songjiang/Qingpu |  | operating |
| cn-shanghai-gds-sh1 | GDS | SH1 Waigaoqiao | Shanghai |  | operating |
| cn-suzhou-gds-kunshan | GDS | Kunshan campus | Suzhou |  | operating |
| cn-beijing-gds-bj2 | GDS | BJ2 | Beijing |  | operating |
| cn-langfang-gds-langfang-i | GDS | Langfang I | Langfang |  | operating |
| cn-beijing-vnet-m6 | VNET | Beijing M6 | Beijing |  | operating |
| cn-shanghai-vnet-waigaoqiao | VNET | Shanghai Waigaoqiao | Shanghai |  | operating |
| cn-beijing-sinnet-aws-bjs | Sinnet | AWS China (Beijing) | Beijing |  | operating |
| cn-beijing-azure-china-north | 21Vianet | Azure China North | Beijing |  | operating |
| cn-shanghai-azure-china-east | 21Vianet | Azure China East | Shanghai |  | operating |
| cn-hangzhou-alibaba-cloud | Alibaba Cloud | Hangzhou region | Hangzhou |  | operating |
| cn-nantong-alibaba-cloud | Alibaba Cloud | Nantong | Nantong |  | operating |
| cn-shanghai-alibaba-cloud | Alibaba Cloud | Shanghai region | Shanghai |  | operating |
| cn-shenzhen-tencent-cloud | Tencent Cloud | Shenzhen region | Shenzhen |  | operating |
| cn-shanghai-tencent-qingpu | Tencent Cloud | Qingpu | Shanghai |  | operating |
| cn-tianjin-tencent-hightech | Tencent Cloud | Tianjin High-tech (second row) | Tianjin |  | operating |
| cn-guangzhou-tencent-cloud | Tencent Cloud | Guangzhou region | Guangzhou |  | operating |
| cn-nanjing-tencent-cloud | Tencent Cloud | Nanjing region | Nanjing |  | operating |
| cn-beijing-baidu-aicloud | Baidu | Beijing region | Beijing |  | operating |
| cn-suzhou-baidu-aicloud | Baidu | Suzhou region | Suzhou |  | operating |
| cn-shanghai-bytedance-volcano | Volcano Engine | Shanghai | Shanghai |  | operating |
| cn-shenzhen-bytedance-volcano | Volcano Engine | Shenzhen | Shenzhen |  | operating |
| cn-guangzhou-china-mobile-idc | China Mobile | Guangzhou South Base | Guangzhou |  | operating |
| cn-shanghai-china-telecom-idc | China Telecom | Shanghai IDC | Shanghai |  | operating |
| cn-dongguan-china-unicom-idc | China Unicom | Dongguan Cloud DC | Dongguan |  | operating |
| cn-foshan-gds-fs | GDS | Foshan | Foshan |  | operating |
| cn-guian-tencent-7star | Tencent Cloud | Gui'an Seven Star (same site family as Qixing) | Gui'an |  | operating |
| cn-ulanqab-apple-2 | Apple | Ulanqab | Ulanqab |  | operating |
| cn-horinger-chinaunicom | China Unicom | Horinger Cloud DC | Horinger |  | operating |
| cn-zhongwei-meili-cloud | Meili Cloud | Zhongwei | Zhongwei |  | operating |
| cn-zhongwei-telecom-cluster | Three carriers | Zhongwei national cluster telecom DCs | Zhongwei |  | construction |
| cn-qingyang-chinatelecom | China Telecom | Qingyang Cloud and Big Data Center (overlaps cn-qingyang-china-telecom) | Qingyang |  | construction |
| cn-qingyang-chindata | Chindata | Qingyang campus | Qingyang |  | construction |
| cn-qingyang-kingsoft | Kingsoft Cloud | Qingyang | Qingyang |  | operating |
| cn-lanzhou-chinatelecom-hub2 | China Telecom | Lanzhou Second Hub | Lanzhou |  | operating |
| cn-zhangbei-alibaba | Alibaba Cloud | Zhangbei | Zhangbei |  | operating |
| cn-huailai-tencent | Tencent Cloud | Huailai | Huailai |  | operating |
| cn-huailai-gds | GDS | Huailai/Zhangjiakou | Huailai |  | operating |
| cn-datong-bytedance | ByteDance | Datong AI DC (overlaps volcano row) | Datong |  | construction |
| cn-chengdu-chinatelecom-tianfu | China Telecom | Chengdu Tianfu | Chengdu |  | operating |
| cn-chengdu-tencent-cloud | Tencent Cloud | Chengdu | Chengdu |  | operating |
| cn-chongqing-chinatelecom | China Telecom | Chongqing | Chongqing |  | operating |
| cn-karamay-chinamobile-aidc | China Mobile | Karamay Intelligent Computing Center | Karamay |  | operating |
| cn-ordos-chindata | Chindata | Ordos campus | Ordos |  | construction |
| cn-wuhan-chinatelecom-jinyinhu | China Telecom | Wuhan Jinyinhu | Wuhan |  | operating |
| cn-wuhan-central-intelligent-computing | Wuhan AIC | Wuhan Central Intelligent Computing Center | Wuhan |  | operating |
| cn-xian-chinaunicom-yanta | China Unicom | Xi'an | Xi'an |  | operating |
| cn-chengdu-alibaba-west | Alibaba Cloud | Chengdu region | Chengdu |  | operating |
| cn-chongqing-tencent-cloud-computing | Tencent Cloud | Chongqing | Chongqing |  | operating |
| cn-changsha-chinatelecom-dongtang | China Telecom | Changsha Dongtang | Changsha |  | operating |
| cn-changsha-chinatelecom-shigu | China Telecom | Changsha Shigu | Changsha |  | operating |
| cn-zhengzhou-chinamobile | China Mobile | Zhengzhou | Zhengzhou |  | operating |
| cn-jinan-chinaunicom-shandong | China Unicom | Jinan | Jinan |  | operating |
| cn-qingdao-chinamobile | China Mobile | Qingdao | Qingdao |  | operating |
| cn-fuzhou-chinatelecom-mawei | China Telecom | Fuzhou Mawei | Fuzhou |  | operating |
| cn-xiamen-chinatelecom-jiangtou | China Telecom | Xiamen Jiangtou | Xiamen |  | operating |
| cn-kunming-chinatelecom-yunnan | China Telecom | Kunming | Kunming |  | operating |
| cn-nanning-chinatelecom-idc | China Telecom | Nanning | Nanning |  | operating |
| cn-hefei-chinatelecom-chuangxin | China Telecom | Hefei Chuangxin | Hefei |  | operating |
| cn-shenyang-chinaunicom-jinqiao | China Unicom | Shenyang | Shenyang |  | operating |
| cn-dalian-chinatelecom-idc | China Telecom | Dalian | Dalian |  | operating |
| cn-harbin-chinamobile-campus | China Mobile | Harbin campus | Harbin |  | operating |
| cn-urumqi-chinatelecom-ii-hub | China Telecom | Urumqi II Hub | Urumqi |  | operating |

### Real estate

| id | project | place |
|---|---|---|
| gds-creit-2025 | GDS China private REIT monetization | Shanghai |
| gds-beijing-shunyi-2019 | Beijing Shunyi campus acquisition | Beijing |

### Policy (announced frameworks, not project MW)

| id | title | date |
|---|---|---|
| cn-edwc | East Data West Compute initiative | 2022-02 |
| cn-pue-cap | PUE caps for new large data centers | 2021-12 |
| cn-green-power-80 | 80 percent renewable mandate for hub data centers | 2024-07 |
| cn-gec-2025 | Green Electricity Certificate policy | 2025-03 |
| cn-ndrc-construction-pause | NDRC restrictions on new data center construction | 2025-03 |

Gaps relative to the ten clusters: no separate rows for Jiashan or Wujiang start areas; Shaoguan is one cluster rollup; Qinghai has no facility row; Ordos has Chindata only.

## Method

Primary means a national, provincial, or municipal government page, an energy-saving review, an EIA or social-stability disclosure, or a grid filing cited inside an approval. State media (Xinhua, People's Daily, Qinghai Daily on qinghai.gov.cn) and trade reprints are secondary. Promotional bias is flagged where the page is an "excellent case" or a company briefing republished by an agency.

Kind labels match the Atlas number kinds. `it_capacity` is data center load. `grid_gen_for_dc` is generation built to supply a data center. Transformer MVA is not either kind.

## Candidates

Full rows are in `2026-09-24-hubs-power.csv`. Verdict counts: **APPEND 7, HOLD 14, REJECT 6**.

### APPEND

1. **datang-zhongwei-500mw-pv** (grid_gen_for_dc, 500 MW, permitted). Ningxia DRC, 29 Oct 2024, approves the 330 kV step-up station and 0.52 km line for the project named "大唐中卫云基地数据中心绿电供应500MW源网荷储光伏项目". State Grid Ningxia interconnection review 宁电发展〔2024〕611号 is a cited precondition and also says 500兆瓦. The instrument does not approve panel construction and says work may not start until safety and EIA procedures are complete. May 2026 "投运" stories on nea.gov.cn are reprints of China Energy News, so operating status is not taken from them. The same sentence names a 2 GW supply program; that envelope is a separate HOLD row and is not added to 500.

2. **tencent-shaoguan-zhenjiang** (it_capacity, MW blank, permitted). Guangdong Energy Bureau 粤能许可〔2024〕81号, published 7 Nov 2024. 4,320 racks at an average 17.36 kW (29,998 standard racks). Annual electricity not above 7,339,200,000 kWh (73392万千瓦时). PUE not above 1.235. Annual coal equivalent not above 90,354 tonnes. Those figures are not converted to MW.

3. **chinatelecom-gba-ii** (it_capacity, MW blank, permitted). Guangdong Energy Bureau 粤能许可〔2025〕11号, 24 Jan 2025. Three data halls, three intelligent-computing halls, three power halls. 8,286 racks, 58,253 standard racks. Annual electricity not above 1,433,290,000 kWh (143329万千瓦时). PUE not above 1.249. Acceptance copy goes to Shaoguan DRC, so the city is Shaoguan. Not the same row as the generic Shaoguan cluster.

4. **ceec-zhongwei-phase1** (it_capacity, MW blank, permitted). Ningxia Department of Industry and IT, 27 Sep 2024. Agrees the energy-saving review for 中能建绿色数字科技(中卫) "东数西算" hub green data center phase 1. The public copy says "能耗数据略". Not the same project as China Mobile Zhongwei.

5. **xiyun-suanli-zhongwei-phase1** (it_capacity, MW blank, permitted). Zhongwei Industry and IT Bureau 卫工信节能审字〔2024〕4号, 12 Nov 2024. 宁夏西云算力科技有限公司 Ningxia intelligent computing center phase 1. Energy figures redacted. Legal name differs from AWS operator 宁夏西云数据科技 (NWCD). Not merged with the AWS row.

6. **ordos-jiale-cloud** (it_capacity, MW blank, permitted). Ordos DRC 鄂发改环资发〔2023〕114号, 29 May 2023. 内蒙古佳乐数据技术有限公司 industrial-internet cloud, Dongsheng equipment base plot F-04-01. Annual energy 6,826.17 tce (calorific) and 17,051.54 tce (coal-equivalent). EEUE 1.18. Investment RMB 120 million is not MW. Not the Chindata Ordos row.

7. **qingyang-cecc-200mw-renewables** (grid_gen_for_dc, 200 MW, announced). National Data Administration case note, 25 Sep 2024, Gansu DRC as recommending body, applicant 中能建绿色数字科技（庆阳）有限公司. "建设20万千瓦容量的风电和光伏设施" and a virtual dedicated line for more than 90 percent renewable supply. This is a selected promotional case, not an operating permit. The 60,000 kW hall total and the September 2024 substation commissioning are trade-press only and sit on HOLD rows.

### HOLD

- **datang-zhongwei-2gw-envelope.** Same Ningxia approval names "2GW绿电供应项目" as the reason for the line. Program envelope. Do not add it to the 500 MW row.
- **datang-zhongwei-1500mw-wind.** 150万千瓦 wind, "计划今年9月全容量并网", appears in China Energy News reprinted by NEA (8 May 2026). No wind-project approval was fetched. Press is not construction.
- **qingyang-cecc-60mw-it.** China Energy Storage Network, citing China Energy Engineering, says 总功率60000千瓦 and partial hall use. Secondary. Do not treat as operating from this page.
- **qingyang-cecc-110kv.** Power industry press, 10 Sep 2024: 110 kV 能建1号变电站 at the same park "建成投产". Trade press. No transformer MVA in the story. Not construction evidence for the Atlas.
- **qingyang-diantou-aggregation.** Xinhua, 30 Jan 2026, via Fujian Economic Information Center: Gansu Power Investment, planned 2,000 MW, first slice 1,000 MW (750 MW wind, 250 MW solar), first machines synchronized. State media. No DRC approval page was fetched. Separate from the CEEC 200 MW case.
- **chinamobile-zhongwei-202-332.** NEA Northwest Bureau page, 26 Jun 2026, body sourced to Polaris: B park IT 202 MW, campus IT 332 MW. Secondary, and the campus is already `cn-zhongwei-china-mobile`.
- **cnpc-horinger-110kv.** Horinger county site, 27 Aug 2026. New 110 kV indoor station, 2 x 50 MVA, Yunnan Cloud Valley area, planned window Mar 2027 to Dec 2027. MVA is not IT load. Disclosure is a social-stability notice, not construction.
- **huadian-horinger-260mw.** Hohhot ecology bureau approval reported as 呼环政批字〔2026〕78号: wind field planned 260 MW (42 x 6.25 MW) and storage 75 MW / 300 MWh, titled as a 300 MW industrial-park green supply project. The fetched excerpt does not name a computing center. Storage is not generation MW.
- **unicom-qinghai-16.8 and unicom-qinghai-32.** Qinghai Daily on qinghai.gov.cn, 19 Aug 2024. Phase 2 planned IT about 16.80 MW (840 racks). Phase 3 about 32 MW (about 984 racks). Signing announcement, word "约" and "拟". Not a filing, so not `approx_filing`.
- **unicom-trina-microgrid.** Same government site, Qinghai Daily, 19 Apr 2025. Microgrid "年均可提供约1000万千瓦时". Kilowatt-hours, not MW. Full-capacity grid connection is a ceremony report.
- **wuhu-cluster-process.** Wuhu Data Administration, 2024 reply: 10 projects have energy-review approval and 6 new substations are planned at RMB 2 billion. No project names or MW. Cluster process, not a row to sum.
- **bocom-horinger-substation.** Hohhot ecology bureau acceptance notice, 28 Aug 2025, for 交通银行和林格尔新区数据中心一期110kV变电站. No load figure in the notice.
- **horinger-load-554-1100.** Inner Mongolia News, 4 Jul 2025: built load 554 MW, "2025年底将达到1100MW". Cluster total from provincial press. Not a project, and not safe to sum.

### REJECT

- **edwc-hub-letters.** NDRC 2022 Yangtze Delta reply sets start areas (Qingpu, Wujiang, Jiashan, Wuhu) and a PUE cap of 1.25. No project MW. Already covered by policy `cn-edwc`. Do not invent hub MW.
- **tencent-shaoguan-do-not-convert.** 4,320 racks times 17.36 kW is arithmetic, not a filed total MW. Reject any derived MW.
- **alibaba-zhangbei-200.** Already `alibaba-zhangbei-renewable` and `cn-zhangbei-alibaba`.
- **chinamobile-horinger-pflops.** Already `cn-horinger-china-mobile`. Peak "6700 PFLOPS" class figures are not MW.
- **shaoguan-cluster-rollup.** Already `cn-shaoguan-gba-cluster`. The two Guangdong energy reviews above are separate projects, not a second copy of this rollup.
- **datang-4600mw-talk.** "460万千瓦" in the China Energy News reprint is a journalist line about a later phase. No filing. Reject as a capacity row.

## Hub context that stays announced only

Eight hubs and ten clusters from the 2022 NDRC replies. Already in policy. Not summed.

| Hub | Clusters | What this pass found |
|---|---|---|
| Beijing-Tianjin-Hebei | Zhangjiakou | No new project MW. Horinger is a different hub. Zhangbei 200 MW is already on the Atlas. |
| Yangtze Delta | Wuhu; Qingpu, Wujiang, Jiashan | Wuhu has a provincial energy-indicator channel and "10 energy reviews" with no public MW list. Jiashan and Wujiang have no new project filing in this pass. ByteDance Wuhu is already a facility row. |
| Guangdong-Hong Kong-Macao | Shaoguan | Two permitted projects with annual kWh caps, not MW. |
| Chengdu-Chongqing | Tianfu; Chongqing | No new primary MW filing in this pass. Existing telecom and cloud rows cover the named campuses. |
| Inner Mongolia | Horinger | Substation disclosures and one small Ordos review. Cluster 554/1100 MW press totals stay off the firm line. |
| Guizhou | Gui'an | No new energy-review MW. CCB Gui'an phase 1 tender (Jul 2023) gives floor area only. |
| Gansu | Qingyang | 200 MW renewable case (announced) plus a separate secondary aggregation plan. |
| Ningxia | Zhongwei | 500 MW named generation project, permitted at the substation step. Two data center energy reviews with redacted energy data. |

Qinghai and Xinjiang are not national hubs. Qinghai government pages describe Unicom plans and a microgrid in kWh. Xinjiang's Karamay and Urumqi carrier sites are already on the Atlas. No new primary generation MW for a Xinjiang computing center was fetched.

China Computing NET and "Guangdong-Hong Kong-Macao computing" are network programs. They have no project MW here.

## Plain English

The Atlas already lists 93 China facilities and six China energy pledges. Most of those pledges are corporate renewable promises with no megawatts. This pass looked only at government and grid paperwork.

The one new megawatt figure that comes from an approval, not from a newspaper, is Datang's 500 MW solar project for the Zhongwei cloud base. Ningxia's planning commission approved the substation and the short power line for that named project in October 2024. It did not, in that document, declare the solar plant finished. A larger "2 GW" label in the same letter is a program name, not a second plant to add on.

Guangdong's energy bureau has permitted two Shaoguan computing projects, one for Tencent and one for China Telecom. The permits cap annual electricity use and rack counts. They do not state a megawatt total, and the rack sizes were not turned into one.

Several other computing centers have passed energy review in Ningxia and Ordos, but the public copies hide the energy numbers. Qingyang has a government case study that says 200 MW of wind and solar for one park. That page is a prize-style writeup, so it is listed as announced, not as built.

Stories that say a wind farm is already running, or that a whole hub has hundreds of megawatts of data center load, stay in the hold pile until a permit or a grid filing says the same thing.

## Action steps to review

1. Read the seven APPEND rows before any Atlas edit. Only Datang 500 MW and Qingyang 200 MW have a megawatt number, and neither is an operating IT load.
2. For Datang, open the Ningxia DRC page and the cited State Grid review 宁电发展〔2024〕611号. Keep 500 MW as generation for the data center. Leave status at permitted unless a later primary page shows synchronization.
3. Do not add the 2 GW sentence, the 1,500 MW wind line, or the 4,600 MW follow-on talk to that 500 MW.
4. For the two Guangdong permits, store the annual kilowatt-hour caps and rack counts in notes. Do not multiply racks by kilowatts per rack.
5. Treat the Ningxia and Ordos energy reviews as permitted facilities with unknown megawatts until an unredacted review or EIA states a figure.
6. Keep the National Data Administration Qingyang 200 MW row as announced grid generation. Ask for the Gansu energy-review or grid-connection file before calling it construction.
7. Leave China Mobile Zhongwei 202/332 MW off the map until it is independent of the Polaris reprint. The facility is already listed.
8. Do not geocode. None of the primary pages in this file give coordinates.
9. Do not merge this file into `src/data`, gh-pages, or PR #15 from this research pass.
