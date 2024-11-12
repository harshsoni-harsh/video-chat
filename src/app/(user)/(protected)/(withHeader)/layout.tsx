import AuthorizedHeader from "@/components/AuthorizedHeader";

export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <AuthorizedHeader />
            {children}
        </>
    )
}