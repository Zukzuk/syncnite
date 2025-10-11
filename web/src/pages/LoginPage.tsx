import * as React from "react";
import { Card, Stack, Text, TextInput, PasswordInput, Button, Alert, Tabs, Group, Badge } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../components/hooks/useAuth";
import { fetchAdminStatus } from "../lib/api";
import { setCreds } from "../lib/persist";

async function post(path: string, body: any) {
  const r = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function LoginPage() {
  const nav = useNavigate();
  const { state } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = React.useState<boolean | null>(null);

  // Hooks are always called — no conditional placement
  const loginForm = useForm({ initialValues: { email: "", password: "" } });
  const registerForm = useForm({ initialValues: { email: "", password: "" } });

  React.useEffect(() => {
    (async () => {
      const s = await fetchAdminStatus();
      setHasAdmin(s.hasAdmin);
    })();
  }, []);

  if (state.ready && state.loggedIn) return <Navigate to="/" replace />;

  const onLogin = loginForm.onSubmit(async ({ email, password }) => {
    setError(null);
    const res = await post("/accounts/login", { email: email.trim().toLowerCase(), password });
    if (res?.ok) { setCreds(email, password); nav("/", { replace: true }); }
    else setError(res?.error || "Invalid email or password");
  });

  const onRegisterAdmin = registerForm.onSubmit(async ({ email, password }) => {
    setError(null);
    const res = await post("/accounts/register", { email: email.trim().toLowerCase(), password });
    if (res?.ok) { setCreds(email, password); nav("/", { replace: true }); }
    else setError(res?.error || "Registration failed");
  });

  const registerDisabled = hasAdmin === true;

  return (
    <Stack gap="md" p="md" maw={520} mx="auto">
      <Text fz={24} fw={700} ta="center">Welcome</Text>
      {error && <Alert color="red">{error}</Alert>}

      <Card withBorder radius="md" p="lg">
        <Tabs defaultValue={hasAdmin ? "login" : "register"} keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="login" disabled={!hasAdmin}>Login</Tabs.Tab>
            <Tabs.Tab value="register">
              Register{hasAdmin && <Badge ml="xs" variant="light">Admin disabled</Badge>}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login" pt="md">
            <form onSubmit={onLogin}>
              <Stack>
                <TextInput label="Email" placeholder="you@example.com" withAsterisk {...loginForm.getInputProps("email")} />
                <PasswordInput label="Password" placeholder="••••••••" withAsterisk {...loginForm.getInputProps("password")} />
                <Group justify="flex-end">
                  <Button type="submit" disabled={!hasAdmin}>Login</Button>
                </Group>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="register" pt="md">
            <form onSubmit={onRegisterAdmin}>
              <Stack>
                {!hasAdmin ? (
                  <Alert variant="light">Create the admin account</Alert>
                ) : (
                  <Alert variant="light" color="yellow">An admin already exists — registering a new admin is disabled.</Alert>
                )}
                <TextInput label="Admin email" placeholder="admin@example.com" withAsterisk disabled={registerDisabled} {...registerForm.getInputProps("email")} />
                <PasswordInput label="Password" placeholder="••••••••" withAsterisk disabled={registerDisabled} {...registerForm.getInputProps("password")} />
                <Group justify="flex-end">
                  <Button type="submit" disabled={registerDisabled}>Create admin</Button>
                </Group>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Stack>
  );
}
