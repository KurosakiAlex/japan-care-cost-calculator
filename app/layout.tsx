import type { Metadata } from "next";
import { Providers } from "@/src/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "親の介護費用・自己負担かんたん計算",
  description: "親の介護で、毎月家計からいくら出るかを目安で見るための説明ツールです。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
