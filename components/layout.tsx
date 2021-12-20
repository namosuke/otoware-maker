import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

export const siteTitle = "Hello world!";

const Layout: NextPage = ({ children }) => {
  return (
    <div
      className="min-h-[100vh] py-[0.1px]"
      style={{
        background:
          "url('torajima.jpg') left/18px repeat-y, url('torajima.jpg') right/18px repeat-y, url('bg.jpg') center",
      }}
    >
      <Head>
        <meta charSet="utf8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>
      {children}
    </div>
  );
};

export default Layout;
