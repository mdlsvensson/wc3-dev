import { Document } from "../../shared/components/Document.tsx";
import { Header } from "../../shared/components/Header.tsx";
import { Landing } from "../../shared/components/Landing.tsx";
import MobileNav from "../islands/MobileNav.tsx";
import Search from "../islands/Search.tsx";

const items = [
  { text: "docs", href: "/moonwell/" },
  { text: "wrappers", href: "/wrappers/" },
  { text: "systems", href: "/systems/" },
];

export default function DocsLandingPage() {
  return (
    <Document
      title="wc3.dev"
      description="Moonwell docs, a multilingual modding framework for Warcraft III: Reforged."
    >
      <Header items={items} leading={<Search />}>
        <MobileNav items={items} />
      </Header>
      <Landing docsOrigin="" />
    </Document>
  );
}
