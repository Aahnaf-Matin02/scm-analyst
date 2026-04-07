import { DM_Sans, Fraunces, Lora } from "next/font/google";
import type { Metadata } from "next";
import ScmAnalystShell from "@/components/scm-analyst-shell";

export const metadata: Metadata = {
  title: "World Supply Chain Country Intelligence",
  description:
    "Search any country to compare market position, bargaining power, geopolitical interaction pressure, and supply chain context."
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces"
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora"
});

export default function ScmAnalystPage() {
  return (
    <main className={`${dmSans.variable} ${fraunces.variable} ${lora.variable}`}>
      <ScmAnalystShell />
    </main>
  );
}
