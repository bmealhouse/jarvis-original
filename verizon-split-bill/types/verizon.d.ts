export namespace Verizon {
  export interface Response {
    body: Body;
  }

  interface Body {
    sections: MainSection[];
  }

  interface MainSection {
    sectionType: string;
    sections: ContentSection[];
  }

  interface ContentSection {
    sectionType: string;
    contents: Content[];
    data: {
      [dataKey: string]: Data;
      groupCharges: GroupCharge[];
    };
  }

  interface GroupCharge {
    subHeaderText: string;
    dataKey: string[];
    mtnNickName: string;
    mtn: string;
  }

  interface Data {
    currentBillCost: string;
    isLineLevel: boolean;
  }

  interface Content {
    contentType?: string;
    items: ContentItem[];
  }

  interface ContentItem {
    itemKey: string;
    itemValue: string;
  }
}
