import styles from "@/styles/Home.module.css";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const RouteLinks = () => {
  return (
    <div className={styles.grid}>
      <Link href="/" className={styles.card}>
        <h2 className={inter.className}>
          Home <span>-&gt;</span>
        </h2>
      </Link>
      <Link href="/server" className={styles.card}>
        <h2 className={inter.className}>
          Server-side rendered page <span>-&gt;</span>
        </h2>
      </Link>
      <Link href="/static" className={styles.card}>
        <h2 className={inter.className}>
          Statically generated page <span>-&gt;</span>
        </h2>
      </Link>
      <Link href="/isr" className={styles.card}>
        <h2 className={inter.className}>
          Incrementally-statically generated page <span>-&gt;</span>
        </h2>
      </Link>
    </div>
  );
};
