import React from "react";
import { Card, Stack, Text, TextInput, PasswordInput, Button, Group, Alert } from "@mantine/core";

async function post(path: string, body: any) {
    const r = await fetch(`/api${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return r.json();
}

export default function AdminPage() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [msg, setMsg] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const remember = (em: string) => {
        try { localStorage.setItem("sb_email", em.toLowerCase()); } catch { }
        // Let listeners refresh
        window.dispatchEvent(new Event("sb:auth-changed"));
    };

    const onRegister = async () => {
        setError(null); setMsg(null);
        const res = await post("/accounts/register", { email: email.trim().toLowerCase(), password });
        if (res?.ok) { remember(res.email || email.trim()); setMsg("Registered as admin."); }
        else setError(res?.error || "Failed");
    };

    const onLogin = async () => {
        setError(null); setMsg(null);
        const res = await post("/accounts/login", { email: email.trim().toLowerCase(), password });
        if (res?.ok) { remember(res.email || email.trim()); setMsg("Login ok."); }
        else setError(res?.error || "Invalid credentials");
    };

    return (
        <Stack p="md" gap="lg">
            <Text fz={24} fw={700}>Admin account</Text>

            <Card>
                <Stack>
                    <TextInput label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
                    <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
                    <Group>
                        <Button onClick={onRegister}>Register / Replace admin</Button>
                        <Button variant="light" onClick={onLogin}>Login</Button>
                    </Group>
                    {msg && <Alert color="green">{msg}</Alert>}
                    {error && <Alert color="red">{error}</Alert>}
                </Stack>
            </Card>
        </Stack>
    );
}
