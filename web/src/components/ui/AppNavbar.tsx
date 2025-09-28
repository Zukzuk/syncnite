import { ScrollArea, NavLink, Text, rem } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import {
    IconHome2,
    IconBooks,
    IconAB2,
    IconSettings,
    IconBuildingBridge2,
} from "../../lib/icons";

export function AppNavbar() {
    const location = useLocation();

    return (
        <ScrollArea style={{ height: "calc(100vh - 56px)" }}>
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
            <NavLink
                component={Link}
                to="/settings"
                label="Settings"
                leftSection={<IconSettings size={18} />}
                active={location.pathname.startsWith("/settings")}
            />
            <Text className="is-dim" size="xs" pl={rem(12)} pt="md">
                v1.0
            </Text>
        </ScrollArea>
    );
}
