import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { RouteLinks } from "@/components/RouteLinks";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [
      {
        params: {
          page: "1",
        },
      },
      {
        params: {
          page: "2",
        },
      },
    ],
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<{}, { page: string }> = ({
  params,
}) => {
  if (!params) {
    throw new Error("NAW");
  }

  return {
    props: {
      page: params.page,
    },
  };
};

export default function DynamicRoute(props: { page: string }) {
  return (
    <DefaultLayout>
      <div className={styles.description}>
        <p>Statically rendered dynamic page</p>
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

      <div className={styles.center}>{props.page}</div>

      <RouteLinks />
    </DefaultLayout>
  );
}
