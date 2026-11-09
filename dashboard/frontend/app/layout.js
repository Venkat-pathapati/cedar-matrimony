import "./globals.css";
import { Providers } from "@/lib/providers";
import Shell from "@/components/Shell";
import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: "Cedar Matrimony",
  description: "Where hearts find their forever - Telugu Christian matrimony",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
