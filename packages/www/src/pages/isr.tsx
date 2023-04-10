import Image from "next/image";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { InferGetStaticPropsType } from "next";
import { RouteLinks } from "@/components/RouteLinks";

const inter = Inter({ subsets: ["latin"] });

export const getStaticProps = async () => {
  return {
    props: {
      randomNumber: Math.random(),
    },
    // will be passed to the page component as props
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 60 seconds
    revalidate: 60, // In seconds
  };
};

export default function Isr(
  props: InferGetStaticPropsType<typeof getStaticProps>
) {
  return (
    <DefaultLayout>
      <div className={styles.description}>
        <p>Incrementally-statically generated page</p>
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
        <h2 className={inter.className}>{props.randomNumber}</h2>
      </div>

      <RouteLinks />
    </DefaultLayout>
  );
}
