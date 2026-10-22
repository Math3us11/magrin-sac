export type DashboardSummaryResponseDto = {
  filters: {
    from: string;
    to: string;
  };
  inProgress: number;
  performed: number;
  resolved: number;
  unresolved: number;
};
