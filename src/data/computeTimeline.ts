export interface TimelineEvent {
  id: string;
  dateLabel: string;
  iso: string | null;
  title: string;
  detail: string;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface TimelineEra {
  id: string;
  title: string;
  summary: string;
  events: TimelineEvent[];
}

export const TIMELINE: TimelineEra[] = [
  {
    id: "rooms",
    title: "Machine rooms",
    summary: "The first electronic computers filled a room. The machine and the room were the same thing.",
    events: [
      {
        id: "eniac",
        dateLabel: "February 14, 1946",
        iso: "1946-02-14",
        title: "ENIAC is announced",
        detail: "Penn Engineering says ENIAC was originally announced on this day at the University of Pennsylvania.",
        sourceName: "Penn Engineering, ENIAC",
        sourceUrl: "https://www.seas.upenn.edu/about/history-heritage/eniac/",
      },
    ],
  },
  {
    id: "timeshare",
    title: "Time-sharing and service bureaus",
    summary: "Time-sharing let many people use one machine at once. A service bureau rented that time to customers who did not own the machine.",
    events: [
      {
        id: "s360",
        dateLabel: "April 7, 1964",
        iso: "1964-04-07",
        title: "IBM launches System/360",
        detail: "IBM says it launched System/360 on this day.",
        sourceName: "IBM history, System/360",
        sourceUrl: "https://www.ibm.com/history/system-360",
      },
      {
        id: "dartmouth",
        dateLabel: "May 1, 1964",
        iso: "1964-05-01",
        title: "Dartmouth time-sharing and BASIC",
        detail: "Dartmouth says time-sharing and BASIC began at 4 a.m. when a professor and a student typed RUN and two terminals returned answers.",
        sourceName: "Dartmouth, BASIC at 50",
        sourceUrl: "https://www.dartmouth.edu/basicfifty/basic.html",
      },
      {
        id: "bureau",
        dateLabel: "",
        iso: null,
        title: "Service bureaus",
        detail: "A service bureau rented time on a machine the customer did not own. A primary date for the first bureau was not confirmed, so this page does not date it.",
        sourceName: null,
        sourceUrl: null,
      },
    ],
  },
  {
    id: "colo",
    title: "Colocation",
    summary: "Colocation puts many customers' machines in one building. The building owner sells space, power, and a connection. The customer still owns the computers.",
    events: [
      {
        id: "equinix-inc",
        dateLabel: "June 22, 1998",
        iso: "1998-06-22",
        title: "Equinix is incorporated",
        detail: "Equinix says it was incorporated in Delaware on this day as a network-neutral multi-tenant data center provider.",
        sourceName: "Equinix investor FAQ",
        sourceUrl: "https://investor.equinix.com/about-equinix/faq",
      },
      {
        id: "equinix-ipo",
        dateLabel: "August 11, 2000",
        iso: "2000-08-11",
        title: "Equinix becomes a public company",
        detail: "Equinix says it became a public company on this day.",
        sourceName: "Equinix investor FAQ",
        sourceUrl: "https://investor.equinix.com/about-equinix/faq",
      },
    ],
  },
  {
    id: "utility",
    title: "Utility compute",
    summary: "Utility compute sells time on someone else's servers. The buyer does not own the machine.",
    events: [
      {
        id: "ec2",
        dateLabel: "August 24, 2006",
        iso: "2006-08-24",
        title: "Amazon EC2 public beta",
        detail: "Amazon posted the Amazon EC2 public beta on this day.",
        sourceName: "AWS What's New",
        sourceUrl: "https://aws.amazon.com/about-aws/whats-new/2006/08/24/announcing-amazon-elastic-compute-cloud-amazon-ec2---beta/",
      },
      {
        id: "ec2-price",
        dateLabel: "August 25, 2006",
        iso: "2006-08-25",
        title: "EC2 beta price posted",
        detail: "The AWS news blog said the beta price was 10 cents per clock hour.",
        sourceName: "AWS News Blog",
        sourceUrl: "https://aws.amazon.com/blogs/aws/amazon_ec2_beta/",
      },
    ],
  },
  {
    id: "gpu",
    title: "GPU computing",
    summary: "A GPU is a chip first built for graphics. CUDA lets programs use that chip for other math. Later chips were built for model training.",
    events: [
      {
        id: "cuda",
        dateLabel: "November 8, 2006",
        iso: "2006-11-08",
        title: "NVIDIA unveils CUDA",
        detail: "NVIDIA's press release says it unveiled CUDA on this day. The copy linked here is the archived release.",
        sourceName: "NVIDIA press release via Internet Archive",
        sourceUrl: "https://web.archive.org/web/20200703112618/http://www.nvidia.com/object/IO_37226.html",
      },
      {
        id: "alexnet",
        dateLabel: "2012",
        iso: "2012",
        title: "AlexNet",
        detail: "The NeurIPS paper ImageNet Classification with Deep Convolutional Neural Networks is dated 2012. The authors are Krizhevsky, Sutskever, and Hinton. This page does not add a month the paper does not give.",
        sourceName: "NeurIPS 2012",
        sourceUrl: "https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html",
      },
      {
        id: "hopper",
        dateLabel: "March 22, 2022",
        iso: "2022-03-22",
        title: "NVIDIA announces Hopper and the H100",
        detail: "NVIDIA announced the Hopper architecture and the H100 GPU on this day. This page does not turn that announcement into a ship date.",
        sourceName: "NVIDIA newsroom",
        sourceUrl: "https://nvidianews.nvidia.com/news/nvidia-announces-hopper-architecture-the-next-generation-of-accelerated-computing",
      },
      {
        id: "h100-prod",
        dateLabel: "September 20, 2022",
        iso: "2022-09-20",
        title: "H100 in full production",
        detail: "NVIDIA said the H100 was in full production on this day.",
        sourceName: "NVIDIA newsroom",
        sourceUrl: "https://nvidianews.nvidia.com/news/nvidia-hopper-in-full-production",
      },
    ],
  },
  {
    id: "ai-hours",
    title: "AI preview and GPU-hour markets",
    summary: "A GPU-hour is one graphics chip rented for one hour. Prices for that hour are in the live panels below. This era does not state a capex total.",
    events: [
      {
        id: "chatgpt",
        dateLabel: "November 30, 2022",
        iso: "2022-11-30",
        title: "ChatGPT research preview",
        detail: "OpenAI introduced ChatGPT as a research preview on this day.",
        sourceName: "OpenAI",
        sourceUrl: "https://openai.com/index/chatgpt/",
      },
    ],
  },
  {
    id: "forwards",
    title: "Forwards and prediction markets",
    summary: "A prediction market pays if a stated event happens. The price is an implied chance, not a measurement. A compute forward prices a later delivery of chips or GPU-hours.",
    events: [
      {
        id: "poly-tag",
        dateLabel: "May 15, 2026",
        iso: "2026-05-15",
        title: "Polymarket Compute tag record",
        detail: "The public Gamma API record for the tag slug compute has createdAt on this day. That is a fact about the tag record. It is not a claim that prediction markets began that day.",
        sourceName: "Polymarket Gamma API",
        sourceUrl: "https://gamma-api.polymarket.com/tags/slug/compute",
      },
    ],
  },
];
