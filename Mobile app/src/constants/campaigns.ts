/**
 * SOLO OS — Campaign definitions.
 * 5 visual progression campaigns with stages.
 */

export type CampaignId = 'gate' | 'ai' | 'fullstack' | 'algorithm' | 'physical';
export type StageStatus = 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'MASTERED';

export interface CampaignStage {
  id: string;
  name: string;
  order: number;
}

export interface CampaignDef {
  id: CampaignId;
  name: string;
  description: string;
  color: string;
  stages: CampaignStage[];
}

import { colors } from '@/theme';

export const CAMPAIGNS: CampaignDef[] = [
  {
    id: 'gate',
    name: 'GATE ASCENSION',
    description: 'Master every GATE CSE subject. From foundations to the final rank push.',
    color: colors.energy,
    stages: [
      { id: 'gate_foundation', name: 'FOUNDATION', order: 1 },
      { id: 'gate_eng_math', name: 'ENGINEERING MATHEMATICS', order: 2 },
      { id: 'gate_digital', name: 'DIGITAL LOGIC', order: 3 },
      { id: 'gate_coa', name: 'COMPUTER ORGANIZATION', order: 4 },
      { id: 'gate_pds', name: 'PROGRAMMING & DATA STRUCTURES', order: 5 },
      { id: 'gate_algo', name: 'ALGORITHMS', order: 6 },
      { id: 'gate_toc', name: 'THEORY OF COMPUTATION', order: 7 },
      { id: 'gate_cd', name: 'COMPILER DESIGN', order: 8 },
      { id: 'gate_os', name: 'OPERATING SYSTEMS', order: 9 },
      { id: 'gate_db', name: 'DATABASES', order: 10 },
      { id: 'gate_cn', name: 'COMPUTER NETWORKS', order: 11 },
      { id: 'gate_pyq', name: 'PYQ CAMPAIGN', order: 12 },
      { id: 'gate_mock', name: 'MOCK TEST CAMPAIGN', order: 13 },
      { id: 'gate_revision', name: 'REVISION CAMPAIGN', order: 14 },
      { id: 'gate_final', name: 'FINAL RANK PUSH', order: 15 },
    ],
  },
  {
    id: 'ai',
    name: 'AI ENGINEER PATH',
    description: 'From Python fundamentals to production AI systems.',
    color: colors.violet,
    stages: [
      { id: 'ai_python', name: 'PYTHON', order: 1 },
      { id: 'ai_numpy', name: 'NUMPY', order: 2 },
      { id: 'ai_pandas', name: 'PANDAS', order: 3 },
      { id: 'ai_math', name: 'MATHEMATICS', order: 4 },
      { id: 'ai_stats', name: 'STATISTICS', order: 5 },
      { id: 'ai_ml', name: 'MACHINE LEARNING', order: 6 },
      { id: 'ai_dl', name: 'DEEP LEARNING', order: 7 },
      { id: 'ai_cv', name: 'COMPUTER VISION', order: 8 },
      { id: 'ai_nlp', name: 'NLP', order: 9 },
      { id: 'ai_mlops', name: 'MLOPS', order: 10 },
      { id: 'ai_prod', name: 'PRODUCTION AI', order: 11 },
      { id: 'ai_portfolio', name: 'AI PORTFOLIO', order: 12 },
    ],
  },
  {
    id: 'fullstack',
    name: 'FULL STACK PATH',
    description: 'Build production-grade full-stack applications.',
    color: colors.cyan,
    stages: [
      { id: 'fs_html', name: 'HTML', order: 1 },
      { id: 'fs_css', name: 'CSS', order: 2 },
      { id: 'fs_js', name: 'JAVASCRIPT', order: 3 },
      { id: 'fs_ts', name: 'TYPESCRIPT', order: 4 },
      { id: 'fs_react', name: 'REACT', order: 5 },
      { id: 'fs_next', name: 'NEXT.JS', order: 6 },
      { id: 'fs_backend', name: 'BACKEND ENGINEERING', order: 7 },
      { id: 'fs_node', name: 'NODE.JS', order: 8 },
      { id: 'fs_db', name: 'DATABASES', order: 9 },
      { id: 'fs_auth', name: 'AUTHENTICATION', order: 10 },
      { id: 'fs_api', name: 'APIS', order: 11 },
      { id: 'fs_arch', name: 'SYSTEM ARCHITECTURE', order: 12 },
      { id: 'fs_test', name: 'TESTING', order: 13 },
      { id: 'fs_deploy', name: 'DEPLOYMENT', order: 14 },
      { id: 'fs_projects', name: 'PRODUCTION PROJECTS', order: 15 },
    ],
  },
  {
    id: 'algorithm',
    name: 'ALGORITHM ASCENSION',
    description: 'Master every major DSA topic from arrays to dynamic programming.',
    color: colors.gold,
    stages: [
      { id: 'alg_arrays', name: 'ARRAYS', order: 1 },
      { id: 'alg_strings', name: 'STRINGS', order: 2 },
      { id: 'alg_ll', name: 'LINKED LISTS', order: 3 },
      { id: 'alg_stacks', name: 'STACKS', order: 4 },
      { id: 'alg_queues', name: 'QUEUES', order: 5 },
      { id: 'alg_hash', name: 'HASHING', order: 6 },
      { id: 'alg_trees', name: 'TREES', order: 7 },
      { id: 'alg_bst', name: 'BINARY SEARCH TREES', order: 8 },
      { id: 'alg_heaps', name: 'HEAPS', order: 9 },
      { id: 'alg_graphs', name: 'GRAPHS', order: 10 },
      { id: 'alg_rec', name: 'RECURSION', order: 11 },
      { id: 'alg_bt', name: 'BACKTRACKING', order: 12 },
      { id: 'alg_greedy', name: 'GREEDY', order: 13 },
      { id: 'alg_dp', name: 'DYNAMIC PROGRAMMING', order: 14 },
      { id: 'alg_advanced', name: 'ADVANCED PROBLEMS', order: 15 },
    ],
  },
  {
    id: 'physical',
    name: 'PHYSICAL ASCENSION',
    description: 'Build strength, endurance, and athletic discipline.',
    color: colors.crimson,
    stages: [
      { id: 'phys_recovery', name: 'MOVEMENT RECOVERY', order: 1 },
      { id: 'phys_consistency', name: 'WORKOUT CONSISTENCY', order: 2 },
      { id: 'phys_strength', name: 'STRENGTH FOUNDATION', order: 3 },
      { id: 'phys_muscle', name: 'MUSCLE BUILDING', order: 4 },
      { id: 'phys_endurance', name: 'ENDURANCE', order: 5 },
      { id: 'phys_athletic', name: 'ATHLETIC DISCIPLINE', order: 6 },
    ],
  },
];

export function getCampaign(id: CampaignId): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}
