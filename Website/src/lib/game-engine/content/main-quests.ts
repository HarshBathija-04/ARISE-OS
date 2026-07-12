export interface MainQuestStageDef {
  key: string;
  title: string;
  description: string;
  targetUnits: number;
}

export interface MainQuestDef {
  key: string;
  title: string;
  description: string;
  theme: string; // color token
  order: number;
  stages: MainQuestStageDef[];
}

const stage = (key: string, title: string, description: string, targetUnits = 100): MainQuestStageDef => ({
  key, title, description, targetUnits,
});

export const MAIN_QUESTS: MainQuestDef[] = [
  {
    key: "gate-ascension", title: "GATE Ascension",
    description: "Crack GATE CSE with a rank capable of a top IIT.",
    theme: "#39a7ff", order: 1,
    stages: [
      stage("foundation", "Foundation", "Rebuild fundamentals across core CS subjects.", 100),
      stage("core-subjects", "Core Subjects", "Cover every GATE core subject once.", 150),
      stage("subject-mastery", "Subject Mastery", "Reach mastery-level understanding per subject.", 200),
      stage("pyq-campaign", "PYQ Campaign", "Solve previous-year questions subject by subject.", 250),
      stage("mock-campaign", "Mock Test Campaign", "Run timed full-length mocks and review them.", 150),
      stage("revision-campaign", "Revision Campaign", "Spaced revision of weak areas.", 150),
      stage("final-push", "Final Rank Push", "Peak performance and exam readiness.", 100),
    ],
  },
  {
    key: "ai-engineer", title: "AI Engineer Path",
    description: "Become genuinely skilled in AI/ML, end to end.",
    theme: "#8b5cff", order: 2,
    stages: [
      stage("python", "Python Mastery", "Fluent, idiomatic Python.", 100),
      stage("math", "Mathematics", "Linear algebra, calculus, probability for ML.", 120),
      stage("data-analysis", "Data Analysis", "NumPy, Pandas, EDA.", 100),
      stage("ml", "Machine Learning", "Classical ML models and evaluation.", 150),
      stage("dl", "Deep Learning", "Neural networks and training.", 150),
      stage("cv", "Computer Vision", "CNNs and vision tasks.", 120),
      stage("nlp", "NLP", "Transformers and language tasks.", 120),
      stage("mlops", "MLOps", "Serving, tracking, pipelines.", 120),
      stage("production-ai", "Production AI", "Ship an AI system to real users.", 150),
      stage("portfolio", "Portfolio Projects", "Two portfolio-grade AI projects.", 150),
    ],
  },
  {
    key: "full-stack", title: "Full Stack Path",
    description: "Become a strong full-stack developer.",
    theme: "#3ce8a0", order: 3,
    stages: [
      stage("htmlcss", "HTML/CSS Mastery", "Layout, responsive design, accessibility.", 80),
      stage("javascript", "JavaScript", "Deep JS + TypeScript.", 120),
      stage("react", "React", "Component architecture and hooks.", 120),
      stage("backend", "Backend", "APIs, auth, server logic.", 120),
      stage("node", "Node.js", "Runtime, tooling, performance.", 100),
      stage("databases", "Databases", "SQL, modelling, indexes.", 100),
      stage("auth", "Authentication", "Sessions, tokens, security.", 80),
      stage("architecture", "System Architecture", "Scalable service design.", 120),
      stage("deployment", "Deployment", "CI/CD, hosting, observability.", 80),
      stage("production", "Production Projects", "Ship a full-stack product.", 150),
    ],
  },
  {
    key: "dsa-path", title: "DSA Path",
    description: "Master data structures and algorithms.",
    theme: "#ff9f45", order: 4,
    stages: [
      stage("arrays", "Arrays", "Patterns and edge cases.", 100),
      stage("strings", "Strings", "String algorithms.", 80),
      stage("linked-lists", "Linked Lists", "Pointer manipulation.", 80),
      stage("stacks", "Stacks", "Monotonic and expression problems.", 60),
      stage("queues", "Queues", "Deques and sliding windows.", 60),
      stage("trees", "Trees", "Traversals and BST/heap.", 120),
      stage("graphs", "Graphs", "BFS/DFS, shortest paths.", 150),
      stage("dp", "Dynamic Programming", "1D/2D/knapsack/intervals.", 200),
      stage("greedy", "Greedy", "Exchange-argument problems.", 100),
      stage("advanced", "Advanced Problems", "Contest-grade challenges.", 150),
    ],
  },
  {
    key: "physical-ascension", title: "Physical Ascension",
    description: "Build muscle, strength, and athletic discipline.",
    theme: "#ff5db1", order: 5,
    stages: [
      stage("movement-recovery", "Movement Recovery", "Mobility and pain-free basics.", 60),
      stage("workout-consistency", "Workout Consistency", "Establish a repeatable routine.", 100),
      stage("strength-foundation", "Strength Foundation", "Progressive overload fundamentals.", 150),
      stage("muscle-building", "Muscle Building", "Hypertrophy and nutrition.", 200),
      stage("endurance", "Endurance", "Cardio base and stamina.", 120),
      stage("athletic-discipline", "Athletic Discipline", "Structured gym program.", 150),
    ],
  },
];
