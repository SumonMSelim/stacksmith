export type Service = {
  slug: string;
  category: string;
  reason: string;
  pricing: string;
};

export type Plan = {
  app_name: string;
  summary: string;
  services: Service[];
  setup_commands: string[];
  env_map: Record<string, string>;
  notes?: string;
};
