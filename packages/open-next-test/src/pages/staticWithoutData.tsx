import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { RouteLinks } from "@/components/RouteLinks";

export default function Static() {
  return (
    <DefaultLayout>
      <div className={styles.description}>
        <p>Statically rendered page</p>
        <div>
          <a
            href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{" "}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className={styles.vercelLogo}
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className={styles.center}>
        {/* <h2 className={inter.className}>{props.randomNumber}</h2> */}
      </div>

      <RouteLinks />
    </DefaultLayout>
  );
}
