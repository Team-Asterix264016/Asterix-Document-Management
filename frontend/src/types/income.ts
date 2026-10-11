export type PaymentMode = "UPI" | "CASH" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export type PaymentStatus = "PAID" | "PENDING" | "PARTIAL";

export interface TreasuryConfig {
  season: string;
  targetPerMember: number;
  currency: string;
  activeMembersCount?: number;
}

export type InstallmentPlanType = "SEASON_MILESTONE" | "MONTHLY_CHIT";

export interface InstallmentPlan {
  _id: string;
  title: string;
  amount: number;
  dueDate: string;
  season: string;
  planType?: InstallmentPlanType;
  billingMonth?: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface MemberInstallmentStatus {
  planId: string;
  planTitle: string;
  planAmount: number;
  planType?: InstallmentPlanType;
  billingMonth?: string;
  dueDate: string;
  status: PaymentStatus;
  amountPaid: number;
  paidAt: string | null;
  paymentMode: PaymentMode | null;
  transactionRef: string;
  notes: string;
  paymentId: string | null;
}

export interface MemberMatrixRow {
  memberId: string;
  displayName: string;
  username: string;
  role: string;
  totalPaid: number;
  milestonePaid?: number;
  monthlyChitPaid?: number;
  target: number;
  remaining: number;
  progressPercent: number;
  installments: MemberInstallmentStatus[];
}

export interface InstallmentsMatrixResponse {
  config: {
    season: string;
    targetPerMember: number;
    currency: string;
    totalMembers: number;
    totalExpected: number;
    totalCollected: number;
    totalPending: number;
    collectionPercentage: number;
    monthlyChitTotalCollected?: number;
    monthlyChitTotalExpected?: number;
    monthlyChitPlansCount?: number;
  };
  plans: InstallmentPlan[];
  matrix: MemberMatrixRow[];
}

export interface EventTier {
  _id?: string;
  tierName: string;
  pricePerParticipant: number;
  registeredCount: number;
}

export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface IncomeEvent {
  _id: string;
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  sessionsCount?: number;
  location: string;
  description: string;
  status: EventStatus;
  tiers: EventTier[];
  totalRevenue: number;
  totalParticipants: number;
  notes: string;
  createdAt: string;
}

export type SponsorTier =
  | "TITLE"
  | "PLATINUM"
  | "GOLD"
  | "SILVER"
  | "TECHNICAL"
  | "MATERIAL"
  | "OTHER";

export type SponsorStatus = "RECEIVED" | "PLEDGED";

export interface IncomeSponsor {
  _id: string;
  sponsorName: string;
  tier: SponsorTier;
  amount: number;
  status: SponsorStatus;
  dateReceived: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  deliverables?: string;
  notes?: string;
  createdAt: string;
}

export type MiscCategory =
  | "COLLEGE_GRANT"
  | "PRIZE_MONEY"
  | "SCRAP_SALE"
  | "MERCHANDISE"
  | "DONATION"
  | "OTHER";

export interface IncomeMisc {
  _id: string;
  title: string;
  category: MiscCategory;
  amount: number;
  dateReceived: string;
  receivedBy: string;
  paymentMode: PaymentMode;
  notes: string;
  createdAt: string;
}

export interface RecentInflowItem {
  id: string;
  type: "INSTALLMENT" | "EVENT" | "SPONSOR" | "MISC";
  title: string;
  amount: number;
  date: string;
  meta?: string;
}

export interface TreasuryOverviewResponse {
  config: TreasuryConfig;
  inflow: {
    total: number;
    breakdown: {
      installments: number;
      events: number;
      sponsorsReceived: number;
      sponsorsPledged: number;
      misc: number;
    };
    installmentsProgress: {
      expectedTotal: number;
      collected: number;
      percentage: number;
      pending: number;
    };
    eventsSummary: {
      count: number;
      totalParticipants: number;
    };
  };
  outflow: {
    totalApproved: number;
    approvedCount: number;
    pendingCount: number;
  };
  netBalance: number;
  recentInflows: RecentInflowItem[];
}
