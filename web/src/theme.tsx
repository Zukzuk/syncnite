import React from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

export const appTheme = createTheme({
    cursorType: 'pointer',
    primaryColor: "grape",
    fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    defaultRadius: "md",
    headings: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    },
    components: {
        Button: { defaultProps: { size: "sm", radius: "md" } },
        TextInput: { defaultProps: { size: "sm", radius: "md" } },
        PasswordInput: { defaultProps: { size: "sm", radius: "md" } },
        Select: { defaultProps: { size: "sm", radius: "md", searchable: true } },
        Textarea: { defaultProps: { size: "sm", radius: "md", autosize: true } },
        Card: { defaultProps: { radius: "lg", withBorder: true, p: "md" } },
        Progress: { defaultProps: { radius: "xl" } },
        Switch: { defaultProps: { size: "md" } },
        Table: { defaultProps: { striped: true, highlightOnHover: true } },
    },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={appTheme} defaultColorScheme="auto">
            <Notifications position="top-right" />
            {children}
        </MantineProvider>
    );
}
