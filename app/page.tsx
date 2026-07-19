import { LiveProductHomePage } from "../src/app/LiveProductHomePage";

export default function HomePage() {
  return <LiveProductHomePage apiBaseUrl={process.env.NEXT_PUBLIC_API_URL} />;
}
