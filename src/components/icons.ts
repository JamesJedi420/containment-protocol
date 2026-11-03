// Shell icons are local SVG components so the shell does not pull lucide-react
// onto the boot path; re-exported here so existing imports keep working.
export {
  IconAgency,
  IconBack,
  IconCases,
  IconCards,
  IconContainment,
  IconDashboard,
  IconEquipment,
  IconFabrication,
  IconFactions,
  IconIntel,
  IconMarkets,
  IconRankings,
  IconRecruitment,
  IconRegistry,
  IconReports,
  IconTeams,
  IconTraining,
  IconAdvance,
  IconSettings,
  IconVolumeOn,
  IconVolumeOff,
} from './shellIcons'

export {
  // Actions
  RotateCcw as IconReset,
  Copy as IconCopy,
  CircleHelp as IconHelp,

  // Stage indicators
  ShieldCheck as IconStageOk,
  AlertTriangle as IconStageWarn,
  OctagonAlert as IconStageCritical,

  // Case status
  CircleDot as IconOpen,
  LoaderCircle as IconInProgress,
  CircleCheck as IconResolved,

  // Case kind
  Swords as IconRaid,

  // Agent roles
  Crosshair as IconHunter,
  Sparkles as IconOccultist,
  Search as IconInvestigator,
  ScanSearch as IconFieldRecon,
  Eye as IconMedium,
  Cpu as IconTech,
  HeartPulse as IconMedic,
  Handshake as IconNegotiator,

  // Agent status
  UserCheck as IconActive,
  HeartCrack as IconInjured,
  Hourglass as IconRecovering,
  Skull as IconDead,

  // Stat categories
  Sword as IconStatCombat,
  ScanSearch as IconStatInvestigation,
  Wrench as IconStatUtility,
  MessageCircle as IconStatSocial,

  // Domain concepts
  TrendingUp as IconStage,
  CalendarClock as IconDeadline,
  BatteryLow as IconFatigue,
  FlaskConical as IconChemistry,
  GitBranch as IconSpawn,
  BarChart2 as IconScore,
} from 'lucide-react'
