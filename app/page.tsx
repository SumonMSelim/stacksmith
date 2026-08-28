import Stacksmith from "@/components/Stacksmith";

export default function Home() {
  return (
    <Stacksmith
      supabaseUrl={process.env.SUPABASE_PROJECT_URL ?? ""}
      supabaseKey={process.env.SUPABASE_PUBLISHABLE_KEY ?? ""}
    />
  );
}
