import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "TeamSync | Professional Productivity Hub",
    description: "A collaborative platform for high-performance teams. Shared tasks, deadlines, and meetings.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <div className="layout-root">
                    <main>{children}</main>
                </div>
            </body>
        </html>
    );
}
