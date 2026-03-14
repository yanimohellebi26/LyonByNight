"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import { User, LogOut, LogIn, Users } from "lucide-react";

export function Header() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Lyon Night Guide
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
    </header>
  );
}
