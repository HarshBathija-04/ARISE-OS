-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Campaigns + stages, Bosses
-- ════════════════════════════════════════════════════════════════

insert into campaigns (id, name, description, accent, sort_order) values
  ('gate','GATE ASCENSION','Crack GATE CSE with a top-IIT rank.','energy',1),
  ('ai','AI ENGINEER PATH','Become highly skilled in AI / ML.','violet',2),
  ('fullstack','FULL STACK PATH','Become a strong full-stack developer.','cyan',3),
  ('algo','ALGORITHM ASCENSION','Master data structures and algorithms.','gold',4),
  ('physical','PHYSICAL ASCENSION','Build muscle, strength, and endurance.','crimson',5)
on conflict (id) do update set
  name=excluded.name, description=excluded.description,
  accent=excluded.accent, sort_order=excluded.sort_order;

-- Stages: (campaign, slug, name, order)
insert into campaign_stages (id, campaign_id, name, sort_order, xp_to_master) values
  -- GATE
  ('gate_foundation','gate','FOUNDATION',1,400),
  ('gate_engmath','gate','ENGINEERING MATHEMATICS',2,600),
  ('gate_digital','gate','DIGITAL LOGIC',3,500),
  ('gate_co','gate','COMPUTER ORGANIZATION',4,600),
  ('gate_pds','gate','PROGRAMMING AND DATA STRUCTURES',5,700),
  ('gate_algo','gate','ALGORITHMS',6,700),
  ('gate_toc','gate','THEORY OF COMPUTATION',7,600),
  ('gate_compiler','gate','COMPILER DESIGN',8,500),
  ('gate_os','gate','OPERATING SYSTEMS',9,600),
  ('gate_db','gate','DATABASES',10,600),
  ('gate_cn','gate','COMPUTER NETWORKS',11,600),
  ('gate_pyq','gate','PYQ CAMPAIGN',12,800),
  ('gate_mock','gate','MOCK TEST CAMPAIGN',13,800),
  ('gate_revision','gate','REVISION CAMPAIGN',14,700),
  ('gate_rankpush','gate','FINAL RANK PUSH',15,1000),
  -- AI
  ('ai_python','ai','PYTHON',1,400),
  ('ai_numpy','ai','NUMPY',2,300),
  ('ai_pandas','ai','PANDAS',3,300),
  ('ai_math','ai','MATHEMATICS',4,500),
  ('ai_stats','ai','STATISTICS',5,500),
  ('ai_ml','ai','MACHINE LEARNING',6,700),
  ('ai_dl','ai','DEEP LEARNING',7,700),
  ('ai_cv','ai','COMPUTER VISION',8,600),
  ('ai_nlp','ai','NLP',9,600),
  ('ai_mlops','ai','MLOPS',10,600),
  ('ai_prod','ai','PRODUCTION AI',11,700),
  ('ai_portfolio','ai','AI PORTFOLIO',12,800),
  -- FULL STACK
  ('fs_html','fullstack','HTML',1,200),
  ('fs_css','fullstack','CSS',2,300),
  ('fs_js','fullstack','JAVASCRIPT',3,500),
  ('fs_ts','fullstack','TYPESCRIPT',4,400),
  ('fs_react','fullstack','REACT',5,600),
  ('fs_next','fullstack','NEXT.JS',6,500),
  ('fs_backend','fullstack','BACKEND ENGINEERING',7,600),
  ('fs_node','fullstack','NODE.JS',8,500),
  ('fs_db','fullstack','DATABASES',9,500),
  ('fs_auth','fullstack','AUTHENTICATION',10,400),
  ('fs_apis','fullstack','APIS',11,500),
  ('fs_arch','fullstack','SYSTEM ARCHITECTURE',12,600),
  ('fs_testing','fullstack','TESTING',13,400),
  ('fs_deploy','fullstack','DEPLOYMENT',14,400),
  ('fs_projects','fullstack','PRODUCTION PROJECTS',15,900),
  -- ALGO
  ('algo_arrays','algo','ARRAYS',1,300),
  ('algo_strings','algo','STRINGS',2,300),
  ('algo_ll','algo','LINKED LISTS',3,400),
  ('algo_stacks','algo','STACKS',4,300),
  ('algo_queues','algo','QUEUES',5,300),
  ('algo_hashing','algo','HASHING',6,400),
  ('algo_trees','algo','TREES',7,500),
  ('algo_bst','algo','BINARY SEARCH TREES',8,500),
  ('algo_heaps','algo','HEAPS',9,400),
  ('algo_graphs','algo','GRAPHS',10,700),
  ('algo_recursion','algo','RECURSION',11,500),
  ('algo_backtrack','algo','BACKTRACKING',12,600),
  ('algo_greedy','algo','GREEDY',13,500),
  ('algo_dp','algo','DYNAMIC PROGRAMMING',14,800),
  ('algo_advanced','algo','ADVANCED PROBLEMS',15,900),
  -- PHYSICAL
  ('phys_recovery','physical','MOVEMENT RECOVERY',1,300),
  ('phys_consistency','physical','WORKOUT CONSISTENCY',2,400),
  ('phys_strength','physical','STRENGTH FOUNDATION',3,500),
  ('phys_muscle','physical','MUSCLE BUILDING',4,600),
  ('phys_endurance','physical','ENDURANCE',5,500),
  ('phys_discipline','physical','ATHLETIC DISCIPLINE',6,600)
on conflict (id) do update set
  campaign_id=excluded.campaign_id, name=excluded.name,
  sort_order=excluded.sort_order, xp_to_master=excluded.xp_to_master;

-- Bosses
insert into bosses (id, name, description, max_hp, weakness, phase_count, sort_order) values
  ('procrastinator','THE PROCRASTINATOR','A weight that grows heavier the longer you wait. Complete productive days to break it.',
    200, array['DEEP_WORK','ROUTINE_COMPLETION','GATE_STUDY']::activity_type[], 3, 1),
  ('distraction','THE DISTRACTION BEAST','Feeds on infinite scroll. Starve it with digital silence.',
    180, array['NO_REELS','DEEP_WORK']::activity_type[], 3, 2),
  ('algorithm_guardian','THE ALGORITHM GUARDIAN','Guards the gate of mastery. Solve to advance.',
    240, array['DSA']::activity_type[], 4, 3),
  ('gatekeeper','THE GATEKEEPER','Stands between you and the top IIT. Only relentless study prevails.',
    360, array['GATE_STUDY']::activity_type[], 5, 4),
  ('iron_trial','THE IRON TRIAL','Tests the body. Train to overcome.',
    220, array['WORKOUT','RUNNING']::activity_type[], 3, 5),
  ('discipline_breaker','THE DISCIPLINE BREAKER','Erodes routine one skipped day at a time.',
    260, array['ROUTINE_COMPLETION','WAKE_5AM']::activity_type[], 4, 6)
on conflict (id) do update set
  name=excluded.name, description=excluded.description, max_hp=excluded.max_hp,
  weakness=excluded.weakness, phase_count=excluded.phase_count, sort_order=excluded.sort_order;
