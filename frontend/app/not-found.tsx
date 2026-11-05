import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-10 font-serif text-8xl font-light text-beige-dark">404</p>
      <h1 className="mt-2 font-serif text-3xl">Cette page n&apos;a pas trouvé son chemin.</h1>
      <p className="mt-2 text-encre">Elle a peut-être été déplacée. Votre mentor, lui, est toujours là.</p>
      <Link href="/accueil" className="mt-8 rounded-full bg-nuit px-6 py-3 text-sm font-semibold text-creme hover:bg-nuit-700">
        Retourner à l&apos;accueil
      </Link>
    </div>
  );
}
