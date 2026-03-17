"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SearchOverlay } from "@/components/shared/SearchOverlay";
import { useAuth } from "@/components/auth/AuthProvider";
import { User, LogOut, LogIn, Users, Search } from "lucide-react";

export function Header() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Open search overlay with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const tGroups = useTranslations("groups");

  const links = [
    { href: "/explorer" as const, label: t("explore") },
    { href: "/carte" as const, label: t("map") },
    { href: "/comparer" as const, label: t("compare") },
    { href: "/evenements" as const, label: t("events") },
  ];

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Lyon<span className="text-primary">Night</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </button>
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Auth section */}
          {!loading && (
            <>
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                    aria-expanded={menuOpen}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline">{displayName}</span>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg">
                      <Link
                        href="/profil"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        {tAuth("profile")}
                      </Link>
                      <Link
                        href="/groupes"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Users className="h-4 w-4" />
                        {tGroups("title")}
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
                      >
                        <LogOut className="h-4 w-4" />
                        {tAuth("logout")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {tAuth("login_button")}
                  </span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
      <div className="glow-line" />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
