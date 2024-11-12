import { AuthProvider } from "@/context/AuthUserContext";

export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen flex flex-col">
            {children}
        </div>
    )
}