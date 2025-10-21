import * as React from "react";
import { ScrollArea, NavLink, Text } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { IconHome2, IconBooks, IconSettings, IconAB2, IconShield, IconUser } from "@tabler/icons-react";
import { GRID } from "../../lib/constants";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminStatus } from "../../lib/api";

export function AppNavbar() {
    const location = useLocation();
    const { state } = useAuth({ pollMs: 0 });
    const [adminEmail, setAdminEmail] = React.useState<string | null>(null);
    const appVersion = (window as any).__APP_VERSION__ ?? 'dev';

    React.useEffect(() => {
        (async () => {
            const s = await fetchAdminStatus();
            setAdminEmail(s.admin);
        })();
    }, []);

    const isAdmin = state.loggedIn && state.email && adminEmail
        ? state.email.toLowerCase() === adminEmail.toLowerCase()
        : false;

    return (
        <ScrollArea style={{ height: `calc(100vh - ${GRID.rowHeight}px)` }}>
            <NavLink
                component={Link}
                to="/"
                label="Home"
                leftSection={<IconHome2 size={18} />}
                active={location.pathname === "/"}
            />
            <NavLink
                component={Link}
                to="/library"
                label="Library"
                leftSection={<IconBooks size={18} />}
                active={location.pathname.startsWith("/library")}
            />
            <NavLink
                component={Link}
                to="/bridge"
                label="Bridge"
                leftSection={<IconAB2 size={18} />}
                active={location.pathname.startsWith("/bridge")}
            />
            {state.loggedIn && (
                <NavLink
                    component={Link}
                    to="/account"
                    label="Account"
                    leftSection={<IconUser size={18} />}
                    active={location.pathname.startsWith("/account")}
                />
            )}
            {isAdmin && (
                <NavLink
                    component={Link}
                    to="/admin"
                    label="Admin"
                    leftSection={<IconShield size={18} />}
                    active={location.pathname.startsWith("/admin")}
                />
            )}
            <NavLink
                component={Link}
                to="/settings"
                label="Settings"
                leftSection={<IconSettings size={18} />}
                active={location.pathname.startsWith("/settings")}
            />

            <Text size="xs" pt="md" pl="md" className="is-dim">v{appVersion}</Text>
        </ScrollArea>
    );
}
