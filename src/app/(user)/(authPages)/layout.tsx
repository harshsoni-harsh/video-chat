'use client'

import Header from "@/components/Header";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full min-h-screen justify-center relative flex flex-col ">
      <Header />
      <div className="">
          {children}
      </div>
    </div>
  )
}