export interface SkillNodeDef {
  key: string;
  title: string;
  description: string;
  tier: number;
  parentKey?: string;
  targetUnits?: number;
}

export interface SkillTreeDef {
  key: string;
  title: string;
  domain: string;
  nodes: SkillNodeDef[];
}

const n = (
  key: string,
  title: string,
  description: string,
  tier: number,
  parentKey?: string,
  targetUnits = 100,
): SkillNodeDef => ({ key, title, description, tier, parentKey, targetUnits });

export const SKILL_TREES: SkillTreeDef[] = [
  {
    key: "gate", title: "GATE CSE", domain: "GATE",
    nodes: [
      n("discrete-math", "Discrete Math", "Sets, logic, combinatorics.", 0),
      n("dbms", "DBMS", "Relational model, SQL, normalization.", 1, "discrete-math"),
      n("os", "Operating Systems", "Processes, memory, scheduling.", 1, "discrete-math"),
      n("cn", "Computer Networks", "Layers, TCP/IP, routing.", 2, "os"),
      n("toc", "Theory of Computation", "Automata, decidability.", 2, "discrete-math"),
      n("coa", "Computer Organization", "Pipelines, cache, ISA.", 2, "os"),
      n("compiler", "Compiler Design", "Parsing, code generation.", 3, "toc"),
      n("algorithms", "Algorithms", "Complexity, paradigms.", 3, "coa"),
    ],
  },
  {
    key: "aiml", title: "AI / ML", domain: "AIML",
    nodes: [
      n("python", "Python", "Language fluency.", 0),
      n("numpy-pandas", "NumPy + Pandas", "Numerical + tabular data.", 1, "python"),
      n("statistics", "Statistics", "Inference and probability.", 2, "numpy-pandas"),
      n("ml", "Machine Learning", "Classical models.", 3, "statistics"),
      n("dl", "Deep Learning", "Neural networks.", 4, "ml"),
      n("cv-nlp", "Computer Vision / NLP", "Applied deep learning.", 5, "dl"),
      n("mlops", "MLOps", "Pipelines and serving.", 6, "cv-nlp"),
      n("prod-ai", "Production AI Systems", "End-to-end AI products.", 7, "mlops"),
    ],
  },
  {
    key: "fullstack", title: "Full Stack", domain: "FULLSTACK",
    nodes: [
      n("htmlcss", "HTML / CSS", "Structure and styling.", 0),
      n("js", "JavaScript", "Core language.", 1, "htmlcss"),
      n("react", "React", "UI components.", 2, "js"),
      n("node", "Node.js", "Server runtime.", 3, "js"),
      n("databases", "Databases", "Persistence.", 4, "node"),
      n("auth", "Authentication", "Identity and sessions.", 5, "databases"),
      n("architecture", "System Architecture", "Service design.", 6, "auth"),
      n("deploy", "Deployment", "Ship and operate.", 7, "architecture"),
    ],
  },
  {
    key: "dsa", title: "DSA", domain: "DSA",
    nodes: [
      n("arrays", "Arrays", "Foundational patterns.", 0),
      n("strings", "Strings", "String techniques.", 1, "arrays"),
      n("linked-lists", "Linked Lists", "Pointer work.", 1, "arrays"),
      n("stacks-queues", "Stacks & Queues", "Linear structures.", 2, "linked-lists"),
      n("trees", "Trees", "Hierarchical data.", 3, "stacks-queues"),
      n("graphs", "Graphs", "Networks and traversal.", 4, "trees"),
      n("dp", "Dynamic Programming", "Optimal substructure.", 5, "graphs"),
      n("advanced", "Advanced", "Contest-grade.", 6, "dp"),
    ],
  },
  {
    key: "system-design", title: "System Design", domain: "SYSTEMDESIGN",
    nodes: [
      n("fundamentals", "Fundamentals", "Latency, throughput, tradeoffs.", 0),
      n("storage", "Storage & Caching", "DBs, caches, CDNs.", 1, "fundamentals"),
      n("scaling", "Scaling", "Load balancing, sharding.", 2, "storage"),
      n("messaging", "Messaging", "Queues and streams.", 3, "scaling"),
      n("reliability", "Reliability", "Resilience and consistency.", 4, "messaging"),
      n("case-studies", "Case Studies", "Design real systems.", 5, "reliability"),
    ],
  },
  {
    key: "data-science", title: "Data Science", domain: "DATASCIENCE",
    nodes: [
      n("data-wrangling", "Data Wrangling", "Cleaning and shaping.", 0),
      n("eda", "EDA", "Exploratory analysis.", 1, "data-wrangling"),
      n("viz", "Visualization", "Communicating data.", 2, "eda"),
      n("stat-modeling", "Statistical Modeling", "Inference and testing.", 3, "viz"),
      n("ml-ds", "ML for DS", "Predictive modeling.", 4, "stat-modeling"),
      n("storytelling", "Data Storytelling", "Insight to decision.", 5, "ml-ds"),
    ],
  },
  {
    key: "fitness", title: "Fitness", domain: "FITNESS",
    nodes: [
      n("mobility", "Mobility", "Pain-free movement.", 0),
      n("consistency", "Consistency", "Show up repeatedly.", 1, "mobility"),
      n("strength", "Strength", "Progressive overload.", 2, "consistency"),
      n("hypertrophy", "Hypertrophy", "Build muscle.", 3, "strength"),
      n("conditioning", "Conditioning", "Cardio and stamina.", 4, "hypertrophy"),
      n("programming", "Program Design", "Structured gym plan.", 5, "conditioning"),
    ],
  },
];
