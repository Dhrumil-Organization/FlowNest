export interface CategoryItem {
    id: string;
  
    name: string;
  
    color: string;
  
    today: string;
  
    updated: string;
  }
  
  export interface TrendData {
    labels: string[];
  
    values: number[];
  }

  export interface TrendPoint {
    label: string;
    value: number;
  }
  
  export interface DashboardData {
    companyName: string;
  
    role: string;
  
    date: string;
  
    updatedTime: string;
  
    totals: {
      ts: string;
      us: string;
    };
  
    trend: {
      title: string;
      data: TrendPoint[];
    };
  
    categories: CategoryItem[];
  }