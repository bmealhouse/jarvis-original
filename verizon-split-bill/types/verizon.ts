export namespace Verizon {
  export interface Summary {
    summary: {
      cq: {
        balanceTxt: string;
      };
    };
  }

  export interface Details {
    data: {
      bill: {
        total: string;
      };
      accountSummaryDetails: AccountSummaryDetail[];
      lineLevelDetails: LineLevelDetails[];
    };
  }

  interface AccountSummaryDetail {
    header: string;
    value: string;
  }

  export interface LineLevelDetails {
    header: string;
    mtn: string;
    value: string;
  }
}
