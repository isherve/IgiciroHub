export type Role = 'cooperative' | 'buyer' | 'admin';
export type PriceType = 'farmgate' | 'cooperative' | 'export';

export interface TrendingPrice {
  coffee_type: string;
  coffee_type_display: string;
  price_type: PriceType;
  currency: string;
  latest_price: string;
  previous_price: string | null;
  change_pct: number;
  market_trend: 'up' | 'down' | 'stable';
  recorded_date: string;
}

export interface CoffeePrice {
  id: number;
  coffee_type: string;
  coffee_type_display: string;
  price_type: PriceType;
  price_type_display: string;
  currency: string;
  market_price: string;
  recorded_date: string;
  season: string;
  market_trend: string;
  cooperative_name?: string | null;
}

export interface PredictionResult {
  id: number;
  coffee_type: string;
  coffee_type_display: string;
  price_type: PriceType;
  price_type_display: string;
  currency: string;
  current_price: string;
  predicted_price: string;
  predicted_price_low: string;
  predicted_price_high: string;
  change_pct: number;
  horizon_days: number;
  historical_period_months: number;
  prediction_date: string;
  algorithm_used: string;
  accuracy_rate: number | null;
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface CropListing {
  id: number;
  cooperative: number;
  cooperative_name: string;
  cooperative_owner: number;
  coffee_type: string;
  coffee_type_display: string;
  quality_grade: string;
  grade_display: string;
  quantity_kg: string;
  price_per_kg: string;
  currency: string;
  location: string;
  description: string;
  photo: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  buyer: number;
  buyer_name: string;
  cooperative: number;
  cooperative_name: string;
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation: number;
  sender: number;
  sender_name: string;
  message: string;
  is_read: boolean;
  interaction_date: string;
}

export interface PriceAlert {
  id: number;
  coffee_type: string;
  coffee_type_display: string;
  price_type: PriceType;
  price_type_display: string;
  threshold: string;
  direction: 'above' | 'below';
  is_active: boolean;
  last_triggered: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  notification_message: string;
  notification_date: string;
  is_read: boolean;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AnalyticsOverview {
  counts: {
    cooperatives: number;
    buyers: number;
    listings: number;
    total_listings: number;
    price_records: number;
    predictions: number;
    predictions_this_week: number;
    conversations: number;
    messages: number;
    active_alerts: number;
    notifications: number;
  };
  market: {
    avg_farmgate_rwf: number;
    avg_export_usd: number;
    trends: { up: number; down: number; stable: number };
  };
  marketplace: {
    total_kg_available: number;
    avg_price_per_kg: number;
  };
  by_variety: {
    coffee_type: string;
    label: string;
    listings: number;
    avg_listing_price: number;
    avg_farmgate: number;
    min_farmgate: number;
    max_farmgate: number;
  }[];
  by_region: {
    region: string;
    cooperatives: number;
    listings: number;
  }[];
  prediction_summary: {
    avg_accuracy: number;
    avg_change_pct: number;
    rising: number;
    falling: number;
    stable: number;
  };
  recent_activity: {
    type: 'prediction' | 'listing' | 'message';
    title: string;
    detail: string;
    timestamp: string;
  }[];
  generated_at: string;
}
