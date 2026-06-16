import { LiveHomePage } from "../src/app/LiveHomePage";

export default function HomePage() {
  return <LiveHomePage apiBaseUrl={process.env.NEXT_PUBLIC_API_URL} />;
}
