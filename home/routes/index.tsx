import { Document } from "../../shared/components/Document.tsx";
import { Header } from "../../shared/components/Header.tsx";
import { Landing } from "../../shared/components/Landing.tsx";
import MobileNav from "../islands/MobileNav.tsx";

const items = [
  { text: "docs", href: "https://docs.wc3.dev/moonwell/" },
  { text: "wrappers", href: "https://docs.wc3.dev/wrappers/" },
  { text: "systems", href: "https://docs.wc3.dev/systems/" },
];

export default function HomePage() {
  return (
    <Document title="wc3.dev">
      <Header items={items}>
        <MobileNav items={items} />
      </Header>
      <Landing docsOrigin="https://docs.wc3.dev" />
    </Document>
  );
}
